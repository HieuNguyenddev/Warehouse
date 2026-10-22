import { request } from "./client";

export function getQualifications(profileId) {
  const query = profileId ? `?profileId=${profileId}` : "";
  return request(`/api/qualifications${query}`);
}

export function createQualification(payload) {
  return request("/api/qualifications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateQualification(id, payload) {
  return request(`/api/qualifications/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteQualification(id) {
  return request(`/api/qualifications/${id}`, {
    method: "DELETE",
  });
}

export function uploadQualificationDocument(file) {
  const body = new FormData();
  body.append("file", file);
  return request("/api/qualifications/document", {
    method: "POST",
    body,
    form: true,
  });
}
