"use client";

import { useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export function useApi() {
  const apiFetch = useCallback((endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");

    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...(options.headers || {}),
      },
    });
  }, []);

  return { apiFetch };
}