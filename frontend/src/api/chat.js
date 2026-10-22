import { request } from "./client";

export function getChatModels() {
  return request("/api/chat/models");
}

export function sendChat(payload) {
  return request("/api/chat/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
