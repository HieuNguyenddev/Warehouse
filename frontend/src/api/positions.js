import { request } from "./client";

export function getPositions() {
  return request("/api/positions");
}

export function createPosition(payload) {
  return request("/api/positions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePosition(id, payload) {
  return request(`/api/positions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePosition(id) {
  return request(`/api/positions/${id}`, {
    method: "DELETE",
  });
}
