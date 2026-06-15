const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const SESSION_EXPIRED_EVENT = "auth:session-expired";

function notifySessionExpired() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    notifySessionExpired();
  }

  return response;
}
