const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
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

  if (!response.ok) {
    const message =
      body?.message ||
      (Array.isArray(body?.errors)
        ? body.errors.join(", ")
        : null) ||
      `Lỗi HTTP ${response.status}`;
    throw new Error(message);
  }

  return body;
}

export function getRoles() {
  return request("/api/roles");
}

export function createRole(payload) {
  return request("/api/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRole(id, payload) {
  return request(`/api/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteRole(id) {
  return request(`/api/roles/${id}`, {
    method: "DELETE",
  });
}
