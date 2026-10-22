import { request } from "./client";

export function getWorkExperiences(profileId) {
  const query = profileId ? `?profileId=${profileId}` : "";
  return request(`/api/work-experiences${query}`);
}

export function createWorkExperience(payload) {
  return request("/api/work-experiences", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWorkExperience(id, payload) {
  return request(`/api/work-experiences/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteWorkExperience(id) {
  return request(`/api/work-experiences/${id}`, {
    method: "DELETE",
  });
}
