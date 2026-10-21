import { clearSession, readSession } from "./session";

const configuredBase = import.meta.env.DEV
  ? import.meta.env.VITE_APP_URL || import.meta.env.VITE_API_BASE_URL || ""
  : import.meta.env.VITE_API_BASE_URL || "";

const API_BASE = configuredBase.replace(/\/$/, "");

function errorMessage(body, status) {
  if (body && typeof body === "object") {
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }

    if (body.errors && typeof body.errors === "object") {
      const values = Array.isArray(body.errors) ? body.errors : Object.values(body.errors).flat();
      const text = values.filter((item) => typeof item === "string" && item.trim()).join(" ");
      if (text) {
        return text;
      }
    }

    if (typeof body.title === "string" && body.title.trim()) {
      return body.title;
    }
  }

  return `Lỗi HTTP ${status}`;
}

export async function request(path, options = {}) {
  const session = readSession();
  const headers = { ...(options.headers || {}) };
  if (!options.form && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (session?.token && !options.skipAuth) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const { skipAuth, form: _form, headers: _ignored, ...rest } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  let body = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (response.status === 401 && !skipAuth) {
    clearSession();
    window.dispatchEvent(new Event("auth:logout"));
  }

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? errorMessage(body, response.status) || "Bạn không có quyền thực hiện thao tác này."
        : errorMessage(body, response.status),
    );
  }

  return body;
}

export function apiBase() {
  return API_BASE;
}

export function authHeaders() {
  const session = readSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}
