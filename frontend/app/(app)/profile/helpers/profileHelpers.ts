export function formatDateForInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("da-DK");
}

export async function readError(response: Response) {
  try {
    const data = await response.json();

    if (Array.isArray(data.message)) {
      return data.message.join("\n");
    }

    return data.message || "Der opstod en fejl.";
  } catch {
    return "Der opstod en fejl.";
  }
}
