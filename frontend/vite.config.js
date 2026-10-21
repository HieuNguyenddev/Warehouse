import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const PRODUCTION_ENV_FILE = ".env.production";

function readViteEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Thiếu ${PRODUCTION_ENV_FILE}. Tạo file này trên VPS trước khi build production.`);
  }

  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key.startsWith("VITE_")) {
      values[key] = value;
    }
  }

  return values;
}

function productionSettings(root) {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("VITE_")) {
      delete process.env[key];
    }
  }

  const env = readViteEnvFile(path.join(root, PRODUCTION_ENV_FILE));
  const apiBase = publicHttpsOrigin(env.VITE_API_BASE_URL);
  const siteKey = cloudflareSiteKey(env.VITE_TURNSTILE_SITE_KEY);

  process.env.VITE_API_BASE_URL = apiBase;
  process.env.VITE_TURNSTILE_SITE_KEY = siteKey;

  return {
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBase),
    "import.meta.env.VITE_TURNSTILE_SITE_KEY": JSON.stringify(siteKey),
  };
}

function publicHttpsOrigin(value) {
  let url;
  try {
    url = new URL((value || "").trim());
  } catch {
    throw new Error("VITE_API_BASE_URL trong .env.production phải là URL https.");
  }

  if (url.username || url.password) {
    throw new Error("VITE_API_BASE_URL không được chứa tài khoản hoặc mật khẩu.");
  }

  if (url.protocol !== "https:" || url.hostname.includes(":") || isPrivateHost(url.hostname)) {
    throw new Error("VITE_API_BASE_URL trên production phải là tên miền công khai dùng https.");
  }

  return url.origin;
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".localhost")) {
    return true;
  }

  const octets = host.split(".");
  if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part))) {
    return false;
  }

  const numbers = octets.map(Number);
  if (numbers.some((part) => part > 255)) {
    return true;
  }

  const [a, b] = numbers;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function cloudflareSiteKey(value) {
  const siteKey = (value || "").trim();
  if (!/^0x[A-Za-z0-9_-]{20,}$/.test(siteKey)) {
    throw new Error("VITE_TURNSTILE_SITE_KEY trong .env.production phải là Site Key Cloudflare dạng 0x. Khóa thử 1x không được dùng cho production.");
  }

  return siteKey;
}

export default defineConfig(({ mode }) => {
  if (mode !== "development") {
    return {
      plugins: [react()],
      define: productionSettings(process.cwd()),
    };
  }

  const env = loadEnv(mode, process.cwd(), "VITE_");
  const proxyTarget = env.VITE_APP_URL || env.VITE_API_BASE_URL || "http://localhost:5252";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
