const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

export const SESSION_EXPIRED_EVENT =
  "auth:session-expired";

const MASTER_SELECTED_CINEMA_ID_KEY =
  "masterSelectedCinemaId";

function notifySessionExpired() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new Event(
      SESSION_EXPIRED_EVENT,
    ),
  );
}

function getMasterSelectedCinemaId() {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    const savedUser =
      localStorage.getItem("user");

    if (!savedUser) {
      return null;
    }

    const user = JSON.parse(
      savedUser,
    ) as {
      role?: string;
    };

    if (user.role !== "MASTER") {
      return null;
    }

    const cinemaId = Number(
      localStorage.getItem(
        MASTER_SELECTED_CINEMA_ID_KEY,
      ),
    );

    if (
      !Number.isInteger(cinemaId) ||
      cinemaId <= 0
    ) {
      return null;
    }

    return cinemaId;
  } catch {
    return null;
  }
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(
          "token",
        )
      : null;
  const headers = new Headers(
    options.headers || {},
  );
  const isFormDataBody =
    typeof FormData !==
      "undefined" &&
    options.body instanceof FormData;

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
      String(masterCinemaId),
    );
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    },
  );

  if (response.status === 401) {
    notifySessionExpired();
  }

  return response;
}
