import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

// Walk upwards to find the repository root that holds the shared .env, so the
// same config works whether the app sits at the root or in a sub-folder.
function findEnvDir(start) {
  let dir = start;

  for (;;) {
    if (
      fs.existsSync(path.join(dir, ".env")) ||
      fs.existsSync(path.join(dir, ".env.example"))
    ) {
      return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

const envDir = findEnvDir(configDir);

export default defineConfig(({ mode }) => {
  // Load the shared .env so VITE_* values and the dev API target are available.
  const env = loadEnv(mode, envDir, "");
  const apiTarget = env.VITE_API_TARGET || "http://127.0.0.1:5000";

  return {
    envDir,
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
