import { request } from "./client";

export function getWarehouses() {
  return request("/api/warehouses");
}

export function createWarehouse(payload) {
  return request("/api/warehouses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWarehouse(id, payload) {
  return request(`/api/warehouses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteWarehouse(id) {
  return request(`/api/warehouses/${id}`, {
    method: "DELETE",
  });
}
