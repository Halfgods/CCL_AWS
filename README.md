# CampusCare — College Complaint Management System

CampusCare is a cloud-hosted college grievance portal. Students sign in through
Amazon Cognito, submit a complaint with photographic evidence and follow its
status. Administrators review complaints, update their status and trigger
notifications.

The application runs on a single Amazon EC2 instance behind Nginx: a React
single-page frontend and a Flask API, backed by Amazon DynamoDB, Amazon S3,
Amazon SNS, Amazon Cognito and Amazon CloudWatch. All AWS access is granted
through a narrowly scoped IAM instance role — no static AWS keys are stored in
the code.

**Live deployment:** <https://ip-10-0-1-99.taild430d2.ts.net/>

## Repository layout

```
.
├── College_complaint/
│   ├── backend/
│   │   ├── app.py               # Flask API (auth, complaints, evidence, status)
│   │   └── requirements.txt
│   └── frontend/                # React + Vite single-page application
│       ├── src/
│       └── vite.config.js
├── report/                      # Typst source, PDF and screenshots
├── .env.example                 # configuration template (safe to commit)
├── .env                         # local configuration (git-ignored)
└── .gitignore
```

## Configuration

Every deployment-specific value lives in a single `.env` file at the repository
root. It is **git-ignored**; only `.env.example` is committed.

```bash
cp .env.example .env
# then edit .env with the values for your AWS account
```

| Variable | Used by | Purpose |
|---|---|---|
| `AWS_REGION` | backend | Region for S3, DynamoDB and SNS clients |
| `S3_BUCKET` | backend | Private bucket that stores complaint evidence |
| `SNS_TOPIC_ARN` | backend | Topic that receives submission and status events |
| `DYNAMODB_TABLE` | backend | Table that stores complaint metadata |
| `COGNITO_ISSUER` | backend | User-pool issuer used to validate JWT signatures |
| `COGNITO_CLIENT_ID` | backend | App client that access tokens must belong to |
| `VITE_COGNITO_AUTHORITY` | frontend | Cognito OIDC authority for the browser sign-in flow |
| `VITE_COGNITO_CLIENT_ID` | frontend | Public SPA client ID (no client secret) |
| `VITE_API_TARGET` | frontend dev server | Backend URL used by the Vite `/api` proxy |
| `LOG_DIR` | backend (optional) | Log directory; defaults to `<repo>/logs` |

Vite only exposes `VITE_*` variables to the browser, so the bucket, table and
SNS values never reach the client bundle.

### Credentials

On EC2, boto3 obtains short-lived credentials from the instance role
`CollegeComplaints-EC2-Role`. For local development, either export normal AWS
credentials or uncomment `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in
`.env` (the standard boto3 credential chain reads them). **Never commit real
credentials.** The `.gitignore` excludes `.env`, `*.pem`, `*.key` and the log
directory.

## Run the backend

```bash
cd College_complaint/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py                  # http://127.0.0.1:5000
```

Health check: `GET /health` → `{"status": "healthy"}`.

## Run the frontend

```bash
cd College_complaint/frontend
npm install
npm run dev                    # http://127.0.0.1:5173
npm run build                  # production bundle in dist/
```

The dev server proxies `/api/*` to `VITE_API_TARGET` and strips the `/api`
prefix. In production Nginx serves `dist/` and proxies `/api/` to Flask with the
same rewrite:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5000/;
}
```

## API summary

| Method | Route | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | public | Liveness probe |
| `POST` | `/complaints` | authenticated | Create a complaint and publish an SNS event |
| `GET` | `/complaints` | authenticated | List complaints (students see only their own) |
| `POST` | `/complaints/<id>/evidence` | owner or admin | Upload a JPG/PNG to the private S3 bucket |
| `GET` | `/complaints/<id>/evidence` | owner or admin | Stream evidence back through the API |
| `PATCH` | `/complaints/<id>/status` | admin (`Admins` group) | Update status and notify subscribers |

Access tokens are Cognito JWTs, verified against the pool's JWKS with RS256;
`token_use`, `client_id` and the `Admins` group are checked on every request.

## Report

`report/CollegeComplaint-Server-AWS-Report.typ` is the source of the project
report and `report/CollegeComplaint-Server-AWS-Report.pdf` is the compiled
20-page document. Rebuild it with:

```bash
cd report
typst compile CollegeComplaint-Server-AWS-Report.typ CollegeComplaint-Server-AWS-Report.pdf
```

## License

MIT — see [LICENSE](LICENSE).
