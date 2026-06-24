export function getErrorMessage(errorText: string) {
  try {
    const parsed = JSON.parse(errorText);

    if (typeof parsed?.message === "string") {
      return parsed.message;
    }

    if (Array.isArray(parsed?.message)) {
      return parsed.message.join("\n");
    }
  } catch {
    // Ikke JSON - brug teksten som den er
  }

  return errorText || "Kunne ikke rette timeregistrering";
}
