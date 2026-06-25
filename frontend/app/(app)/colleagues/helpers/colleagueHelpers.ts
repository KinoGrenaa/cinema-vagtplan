export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
};

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {}

  return fallback;
}
