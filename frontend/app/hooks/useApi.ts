"use client";

import { useAuth } from "../providers/AuthProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useApi() {
  const { token, logout } = useAuth();

  async function apiFetch(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      logout();
    }

    return response;
  }

  return {
    apiFetch,
  };
}
