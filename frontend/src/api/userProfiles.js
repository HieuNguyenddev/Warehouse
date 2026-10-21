import { request } from "./client";

export function getUserProfiles() {
  return request("/api/user-profiles");
}

export function createUserProfile(payload) {
  return request("/api/user-profiles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUserProfile(id, payload) {
  return request(`/api/user-profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteUserProfile(id) {
  return request(`/api/user-profiles/${id}`, {
    method: "DELETE",
  });
}
