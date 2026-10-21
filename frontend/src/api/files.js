import { apiBase, authHeaders, request } from "./client";
import { clearSession } from "./session";

export function getFiles() {
  return request("/api/files");
}

export function uploadFile(file) {
  const body = new FormData();
  body.append("file", file);
  return request("/api/files", {
    method: "POST",
    body,
    form: true,
  });
}

export function deleteStoredFile(file) {
  const folder = file.folder === "avatars" ? "?folder=avatars" : "";
  return request(`/api/files/${encodeURIComponent(file.name)}${folder}`, {
    method: "DELETE",
  });
}

export async function downloadFile(file) {
  const path = file.url || `/api/files/${encodeURIComponent(file.name)}`;
  const response = await fetch(`${apiBase()}${path}`, {
    headers: authHeaders(),
  });
  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event("auth:logout"));
    throw new Error("Phiên đăng nhập đã hết.");
  }
  if (!response.ok) {
    throw new Error("Không tải được tệp.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName || file.name;
  link.click();
  URL.revokeObjectURL(url);
}
