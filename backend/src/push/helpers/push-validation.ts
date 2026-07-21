import { BadRequestException } from "@nestjs/common";
import { isIP } from "node:net";
import type {
  PushPayload,
  SavePushSubscriptionInput,
  ValidatedPushSubscriptionInput,
} from "./push-types";

const MAX_ENDPOINT_LENGTH = 2048;
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 1000;
const MAX_URL_LENGTH = 512;
const PUSH_KEY_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

export function getRequiredPositivePushId(value: unknown, message: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(message);
  }

  return id;
}

function getRequiredTrimmedString(
  value: unknown,
  message: string,
  maxLength: number,
) {
  if (typeof value !== "string") {
    throw new BadRequestException(message);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue || normalizedValue.length > maxLength) {
    throw new BadRequestException(message);
  }

  return normalizedValue;
}

export function normalizePushEndpoint(value: unknown) {
  const endpoint = getRequiredTrimmedString(
    value,
    "Push-endpoint er ugyldigt",
    MAX_ENDPOINT_LENGTH,
  );

  let parsedEndpoint: URL;

  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    throw new BadRequestException("Push-endpoint er ugyldigt");
  }

  const hostname = parsedEndpoint.hostname
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .toLowerCase();

  if (
    parsedEndpoint.protocol !== "https:" ||
    parsedEndpoint.username ||
    parsedEndpoint.password ||
    parsedEndpoint.hash ||
    (parsedEndpoint.port && parsedEndpoint.port !== "443") ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    isIP(hostname) !== 0
  ) {
    throw new BadRequestException("Push-endpoint er ugyldigt");
  }

  return endpoint;
}

export function normalizePushKey(value: unknown, fieldName: "p256dh" | "auth") {
  const message =
    fieldName === "p256dh"
      ? "Push-nøgle er ugyldig"
      : "Push-godkendelse er ugyldig";
  const key = getRequiredTrimmedString(
    value,
    message,
    fieldName === "p256dh" ? 512 : 128,
  );
  const minimumLength = fieldName === "p256dh" ? 40 : 8;

  if (key.length < minimumLength || !PUSH_KEY_PATTERN.test(key)) {
    throw new BadRequestException(message);
  }

  return key;
}

export function normalizePushSubscriptionInput(
  input: SavePushSubscriptionInput,
): ValidatedPushSubscriptionInput {
  return {
    userId: getRequiredPositivePushId(
      input?.userId,
      "Bruger skal være et gyldigt ID",
    ),
    cinemaId: getRequiredPositivePushId(
      input?.cinemaId,
      "Biograf skal være et gyldigt ID",
    ),
    endpoint: normalizePushEndpoint(input?.endpoint),
    p256dh: normalizePushKey(input?.p256dh, "p256dh"),
    auth: normalizePushKey(input?.auth, "auth"),
  };
}

function normalizePushUrl(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const url = getRequiredTrimmedString(
    value,
    "Push-link er ugyldigt",
    MAX_URL_LENGTH,
  );

  if (!url.startsWith("/") || url.startsWith("//")) {
    throw new BadRequestException("Push-link er ugyldigt");
  }

  return url;
}

export function normalizePushPayload(payload: PushPayload): PushPayload {
  return {
    title: getRequiredTrimmedString(
      payload?.title,
      "Push-titel er ugyldig",
      MAX_TITLE_LENGTH,
    ),
    body: getRequiredTrimmedString(
      payload?.body,
      "Push-besked er ugyldig",
      MAX_BODY_LENGTH,
    ),
    url: normalizePushUrl(payload?.url),
  };
}
