"use client";

import { useCallback } from "react";
import { useAuth } from "../providers/AuthProvider";

const API_URL = "${process.env.NEXT_PUBLIC_API_URL}";

export function useApi() {
  const { logout } = useAuth();

  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = localStorage.getItem("token");

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        console.warn("401 fra API:", path);
      }

      return response;
    },
    [],
  );

  return { apiFetch };
}