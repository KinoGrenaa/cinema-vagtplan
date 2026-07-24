import type {
  CurrentUser,
} from '../../../../shared/types';
import { apiFetch } from '../../lib/api';

export type ActiveCinemaOption = {
  id: number;
  name: string;
  logoUrl: string | null;
  isDefault: boolean;
};

export type ActiveCinemaOptionsResponse = {
  role: CurrentUser['role'];
  defaultCinemaId: number | null;
  allowNoDefault: boolean;
  cinemas: ActiveCinemaOption[];
};

export type SwitchedCinemaSession = {
  access_token: string;
  user: CurrentUser;
  selectedCinema: {
    id: number;
    name: string;
    logoUrl: string | null;
  };
  isDefaultCinema: boolean;
};

async function readApiError(
  response: Response,
  fallback: string,
) {
  try {
    const data =
      await response.json();

    if (
      typeof data?.message ===
        'string' &&
      data.message.trim()
    ) {
      return data.message;
    }

    if (
      Array.isArray(data?.message) &&
      data.message.length > 0
    ) {
      return data.message.join('\n');
    }
  } catch {
    // Brug fallback, hvis serverens svar ikke er JSON.
  }

  return fallback;
}

export async function fetchActiveCinemaOptions() {
  const response = await apiFetch(
    '/auth/default-cinema-options',
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        'Dine biograftilknytninger kunne ikke hentes.',
      ),
    );
  }

  return (
    await response.json()
  ) as ActiveCinemaOptionsResponse;
}

export async function switchActiveCinema(
  cinemaId: number,
) {
  const response = await apiFetch(
    '/auth/switch-cinema',
    {
      method: 'POST',
      body: JSON.stringify({
        cinemaId,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        'Den aktive biograf kunne ikke skiftes.',
      ),
    );
  }

  return (
    await response.json()
  ) as SwitchedCinemaSession;
}
