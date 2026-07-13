export async function readErrorMessage(
  response: Response,
  fallback: string,
) {
  try {
    const data = await response.json();
    if (Array.isArray(data.message)) {
      return data.message.join("\n");
    }
    return data.message || fallback;
  } catch {
    return fallback;
  }
}
