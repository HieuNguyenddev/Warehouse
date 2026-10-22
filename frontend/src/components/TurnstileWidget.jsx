import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise;

function loadScript() {
  if (window.turnstile) {
    return Promise.resolve();
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("script")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("script"));
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}

export const turnstileSiteKey = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_TURNSTILE_SITE_KEY || "");

export default function TurnstileWidget({ theme, resetKey, onToken, onError }) {
  const hostRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!turnstileSiteKey || !hostRef.current) {
      return undefined;
    }

    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !hostRef.current || !window.turnstile) {
          return;
        }

        hostRef.current.replaceChildren();
        widgetRef.current = window.turnstile.render(hostRef.current, {
          sitekey: turnstileSiteKey,
          theme: theme === "dark" ? "dark" : "light",
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(""),
          "error-callback": () => {
            onToken("");
            onError("Không tải được xác thực Cloudflare. Kiểm tra mạng rồi thử lại.");
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          onError("Không tải được xác thực Cloudflare. Kiểm tra mạng rồi thử lại.");
        }
      });

    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, [theme, resetKey, onToken, onError]);

  if (!turnstileSiteKey) {
    return null;
  }

  return (
    <div className="turnstile-box">
      <div ref={hostRef} />
      <small>Cloudflare xác nhận trước khi vào trang quản trị.</small>
    </div>
  );
}
