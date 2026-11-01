import io
import logging
import os
import uuid
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

import boto3
import jwt
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from flask import Flask, g, jsonify, redirect, request, send_file
from flask_cors import CORS
from jwt import PyJWKClient
from werkzeug.utils import secure_filename

# --------------------------------------------------
# Environment
# --------------------------------------------------

# The shared .env lives at the repository root. Walk upwards from backend/ so
# the same code works whether the app sits at the root or in a sub-folder.
def find_project_root(start):
    for directory in (start, *start.parents):
        if (directory / ".env").is_file() or (directory / ".env.example").is_file():
            return directory
    return start


BASE_DIR = find_project_root(Path(__file__).resolve().parent)
load_dotenv(BASE_DIR / ".env")


def required_env(name):
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(
            f"Missing required environment variable {name}. "
            "Copy .env.example to .env at the repository root and fill it in."
        )
    return value


# --------------------------------------------------
# Logging
# --------------------------------------------------

LOG_DIR = Path(os.getenv("LOG_DIR") or BASE_DIR / "logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "app.log"),
        logging.StreamHandler(),
    ],
    force=True,
)

app = Flask(__name__)
CORS(app)

# --------------------------------------------------
# AWS configuration
# --------------------------------------------------

AWS_REGION = os.getenv("AWS_REGION", "us-east-1").strip()
S3_BUCKET = required_env("S3_BUCKET")
SNS_TOPIC_ARN = required_env("SNS_TOPIC_ARN")
DYNAMODB_TABLE = required_env("DYNAMODB_TABLE")

# No static credentials are configured here. On EC2, boto3 uses the
# CollegeComplaints-EC2-Role instance role; for local development the optional
# AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY entries in .env are picked up by
# the standard boto3 credential chain.
s3 = boto3.client("s3", region_name=AWS_REGION)
sns = boto3.client("sns", region_name=AWS_REGION)
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(DYNAMODB_TABLE)

# --------------------------------------------------
# Cognito configuration
# --------------------------------------------------

COGNITO_ISSUER = required_env("COGNITO_ISSUER").rstrip("/")
COGNITO_CLIENT_ID = required_env("COGNITO_CLIENT_ID")
JWKS_URL = f"{COGNITO_ISSUER}/.well-known/jwks.json"

jwks_client = PyJWKClient(JWKS_URL)

# --------------------------------------------------
# Authentication and authorization
# --------------------------------------------------

def require_auth(admin_only=False):
    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            authorization = request.headers.get("Authorization", "")

            if not authorization.startswith("Bearer "):
                return jsonify({"error": "Authentication required"}), 401

            token = authorization.split(" ", 1)[1].strip()

            try:
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                claims = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256"],
                    issuer=COGNITO_ISSUER,
                    options={"verify_aud": False},
                )

                if claims.get("token_use") != "access":
                    return jsonify({"error": "An access token is required"}), 401

                if claims.get("client_id") != COGNITO_CLIENT_ID:
                    return jsonify({"error": "Invalid application client"}), 401

                g.current_user = claims
                g.user_sub = claims["sub"]
                g.is_admin = "Admins" in claims.get("cognito:groups", [])

                if admin_only and not g.is_admin:
                    return jsonify({"error": "Administrator access required"}), 403

            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Session expired. Please sign in again."}), 401
            except Exception:
                app.logger.warning("Authentication failed", exc_info=True)
                return jsonify({"error": "Invalid or expired access token"}), 401

            return function(*args, **kwargs)

        return wrapper
    return decorator


def can_access_complaint(complaint):
    """Admins can access all complaints; students only their own."""
    return g.is_admin or complaint.get("createdBySub") == g.user_sub


# --------------------------------------------------
# Public health endpoints
# --------------------------------------------------

@app.route("/")
def home():
    return jsonify({
        "application": "College Complaint Management System",
        "status": "running",
    })


@app.route("/health")
def health():
    return jsonify({"status": "healthy"}), 200


# --------------------------------------------------
# Upload evidence to private S3
# --------------------------------------------------

@app.route("/complaints/<complaint_id>/evidence", methods=["POST"])
@require_auth()
def upload_evidence(complaint_id):
    if "photo" not in request.files:
        return jsonify({"error": "No photo provided"}), 400

    photo = request.files["photo"]

    if not photo.filename:
        return jsonify({"error": "No file selected"}), 400

    filename = secure_filename(photo.filename)
    allowed_extensions = {".jpg", ".jpeg", ".png"}
    extension = os.path.splitext(filename)[1].lower()

    if extension not in allowed_extensions:
        return jsonify({"error": "Only JPG and PNG images are allowed"}), 400

    try:
        result = table.get_item(Key={"complaintId": complaint_id})
        complaint = result.get("Item")

        if not complaint:
            return jsonify({"error": "Complaint not found"}), 404

        if not can_access_complaint(complaint):
            return jsonify({"error": "Access denied"}), 403

        object_key = f"complaints/{complaint_id}/{uuid.uuid4().hex}_{filename}"

        s3.upload_fileobj(
            photo,
            S3_BUCKET,
            object_key,
            ExtraArgs={"ContentType": photo.mimetype},
        )

        table.update_item(
            Key={"complaintId": complaint_id},
            UpdateExpression="SET evidenceKey = :key",
            ExpressionAttributeValues={":key": object_key},
        )

        app.logger.info("Evidence uploaded for complaint %s", complaint_id)

        return jsonify({
            "message": "Evidence uploaded successfully",
            "complaintId": complaint_id,
            "evidenceKey": object_key,
        }), 200

    except ClientError:
        app.logger.exception("Evidence upload failed")
        return jsonify({"error": "Evidence upload failed"}), 500


# --------------------------------------------------
# View evidence through a temporary S3 URL
# --------------------------------------------------

@app.route("/complaints/<complaint_id>/evidence", methods=["GET"])
@require_auth()
def view_evidence(complaint_id):
    try:
        result = table.get_item(Key={"complaintId": complaint_id})
        complaint = result.get("Item")

        if not complaint:
            return jsonify({"error": "Complaint not found"}), 404

        if not can_access_complaint(complaint):
            return jsonify({"error": "Access denied"}), 403

        object_key = complaint.get("evidenceKey")

        if not object_key:
            return jsonify({"error": "No evidence uploaded"}), 404

        # The S3 bucket is private. Flask fetches the object with the EC2
        # instance role and streams the bytes to the browser, so the frontend
        # only ever talks to our own authenticated endpoint (no Lambda, no
        # public S3 URL, no CORS needed).
        try:
            s3_object = s3.get_object(Bucket=S3_BUCKET, Key=object_key)
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") in (
                "NoSuchKey",
                "404",
                "NotFound",
            ):
                return jsonify({"error": "Evidence file not found"}), 404
            raise

        body = s3_object["Body"].read()
        content_type = s3_object.get("ContentType") or "image/jpeg"

        app.logger.info("Evidence served for complaint %s", complaint_id)

        return send_file(
            io.BytesIO(body),
            mimetype=content_type,
            download_name=os.path.basename(object_key),
            max_age=0,
        )

    except ClientError:
        app.logger.exception("Evidence viewing failed")
        return jsonify({"error": "Could not retrieve evidence"}), 500


# --------------------------------------------------
# Create a complaint
# --------------------------------------------------

@app.route("/complaints", methods=["POST"])
@require_auth()
def create_complaint():
    data = request.get_json(silent=True) or {}

    student_name = data.get("studentName", "").strip()
    category = data.get("category", "").strip()
    description = data.get("description", "").strip()

    if not student_name or not category or not description:
        return jsonify({
            "error": "studentName, category and description are required"
        }), 400

    complaint = {
        "complaintId": str(uuid.uuid4()),
        "studentName": student_name,
        "category": category,
        "description": description,
        "status": "Pending",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "createdBySub": g.user_sub,
    }

    try:
        table.put_item(Item=complaint)

        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject="New College Complaint Submitted",
            Message=(
                "New complaint submitted.\n\n"
                f"Complaint ID: {complaint['complaintId']}\n"
                f"Student: {complaint['studentName']}\n"
                f"Category: {complaint['category']}\n"
                f"Description: {complaint['description']}\n"
                f"Status: {complaint['status']}"
            ),
        )

        app.logger.info("Complaint created: %s", complaint["complaintId"])

        return jsonify({
            "message": "Complaint submitted successfully",
            "complaint": complaint,
        }), 201

    except ClientError:
        app.logger.exception("Failed to save complaint")
        return jsonify({"error": "Could not save complaint"}), 500


# --------------------------------------------------
# List complaints
# --------------------------------------------------

@app.route("/complaints", methods=["GET"])
@require_auth()
def list_complaints():
    try:
        response = table.scan()
        complaints = response.get("Items", [])

        while response.get("LastEvaluatedKey"):
            response = table.scan(
                ExclusiveStartKey=response["LastEvaluatedKey"]
            )
            complaints.extend(response.get("Items", []))

        if not g.is_admin:
            complaints = [
                item for item in complaints
                if item.get("createdBySub") == g.user_sub
            ]

        return jsonify(complaints), 200

    except ClientError:
        app.logger.exception("Failed to retrieve complaints")
        return jsonify({"error": "Could not retrieve complaints"}), 500


# --------------------------------------------------
# Update status (Admins only)
# --------------------------------------------------

@app.route("/complaints/<complaint_id>/status", methods=["PATCH"])
@require_auth(admin_only=True)
def update_complaint_status(complaint_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status", "").strip()

    allowed_statuses = ["Pending", "In Progress", "Resolved"]

    if new_status not in allowed_statuses:
        return jsonify({
            "error": "Status must be Pending, In Progress, or Resolved"
        }), 400

    try:
        result = table.update_item(
            Key={"complaintId": complaint_id},
            UpdateExpression="SET #s = :status",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":status": new_status},
            ConditionExpression="attribute_exists(complaintId)",
            ReturnValues="ALL_NEW",
        )

        app.logger.info(
            "Complaint %s status changed to %s", complaint_id, new_status
        )

        return jsonify({
            "message": "Complaint status updated",
            "complaint": result["Attributes"],
        }), 200

    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return jsonify({"error": "Complaint not found"}), 404

        app.logger.exception("Status update failed")
        return jsonify({"error": "Failed to update status"}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
