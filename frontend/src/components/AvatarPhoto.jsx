import { useEffect, useState } from "react";
import { apiBase, authHeaders } from "../api/client";

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

export default function AvatarPhoto({ url, name, className = "avatar-photo" }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!url) {
      setSrc("");
      return undefined;
    }

    const external = /^https?:\/\//i.test(url) && !url.includes("/api/user-profiles/avatars/");
    if (external) {
      setSrc(url);
      return undefined;
    }

    const path = url.startsWith("/") ? url : `/${url}`;
    const controller = new AbortController();
    let objectUrl = "";
    fetch(`${apiBase()}${path}`, { headers: authHeaders(), signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {});

    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  if (!src) {
    return <span className={`${className} is-empty`}>{initials(name)}</span>;
  }

  return <img className={className} src={src} alt="" />;
}
