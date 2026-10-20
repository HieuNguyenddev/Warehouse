const KEY = "warehouse.session";

export function readSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw);
    if (!session?.token || !session.user) {
      localStorage.removeItem(KEY);
      return null;
    }

    if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
