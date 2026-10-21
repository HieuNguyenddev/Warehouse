import { request } from "./client";

export function getProvinces() {
  return request("/api/locations/provinces");
}

export function getWards(provinceCode) {
  return request(`/api/locations/provinces/${encodeURIComponent(provinceCode)}/wards`);
}
