"use client";

import {
  useCallback,
} from "react";

import {
  fetchWithGetCoalescing,
} from "@/app/lib/apiRequest";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL!;

const MASTER_SELECTED_CINEMA_ID_KEY =
  "masterSelectedCinemaId";

function getMasterSelectedCinemaId() {
  try {
    const savedUser =
      localStorage.getItem(
        "user",
      );

    if (!savedUser) {
      return null;
    }

    const user =
      JSON.parse(
        savedUser,
      ) as {
        role?: string;
      };

    if (
      user.role !==
      "MASTER"
    ) {
      return null;
    }

    const cinemaId =
      Number(
        localStorage.getItem(
          MASTER_SELECTED_CINEMA_ID_KEY,
        ),
      );

    if (
      !Number.isInteger(
        cinemaId,
      ) ||
      cinemaId <= 0
    ) {
      return null;
    }

    return cinemaId;
  } catch {
    return null;
  }
}

export function useApi() {
  const apiFetch =
    useCallback(
      (
        endpoint: string,
        options:
          RequestInit = {},
      ) => {
        const token =
          localStorage.getItem(
            "token",
          );
        const headers =
          new Headers(
            options.headers ||
              {},
          );
        const isFormDataBody =
          typeof FormData !==
            "undefined" &&
          options.body instanceof
            FormData;

        if (
          !headers.has(
            "Content-Type",
          ) &&
          !isFormDataBody
        ) {
          headers.set(
            "Content-Type",
            "application/json",
          );
        }

        if (token) {
          headers.set(
            "Authorization",
            `Bearer ${token}`,
          );
        }

        const masterCinemaId =
          getMasterSelectedCinemaId();

        if (masterCinemaId) {
          headers.set(
            "X-Cinema-Id",
            String(
              masterCinemaId,
            ),
          );
        }

        return fetchWithGetCoalescing(
          `${API_URL}${endpoint}`,
          {
            ...options,
            headers,
          },
        );
      },
      [],
    );

  return {
    apiFetch,
  };
}
