import { request } from "./client";

export function getUsers() {
  return request("/api/users");
}

export function createUser(payload) {
  return request("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(id, payload) {
  return request(`/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function changePassword(id, payload) {
  return request(`/api/users/${id}/password`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function setUserLock(id, isLocked) {
  return request(`/api/users/${id}/lock`, {
    method: "PUT",
    body: JSON.stringify({ isLocked }),
  });
}

export function deleteUser(id) {
  return request(`/api/users/${id}`, {
    method: "DELETE",
  });
}
