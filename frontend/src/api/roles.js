import { request } from "./client";

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
