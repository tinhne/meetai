const KNOWN_ERROR_CODES = [
  "INVALID_EMAIL_OR_PASSWORD",
  "EMAIL_NOT_VERIFIED",
  "USER_ALREADY_EXISTS",
  "PASSWORD_TOO_SHORT",
  "PASSWORD_TOO_LONG",
  "INVALID_TOKEN",
  "TOO_MANY_REQUESTS",
] as const;

export type AuthErrorKey = (typeof KNOWN_ERROR_CODES)[number] | "generic";

// Maps a Better Auth client error to a translation key under auth.errors.
export function getAuthErrorKey(error: {
  code?: string;
  status?: number;
}): AuthErrorKey {
  if (error.status === 429) return "TOO_MANY_REQUESTS";

  const code =
    error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
      ? "USER_ALREADY_EXISTS"
      : error.code;

  if (code && (KNOWN_ERROR_CODES as readonly string[]).includes(code)) {
    return code as AuthErrorKey;
  }

  if (error.status === 403) return "EMAIL_NOT_VERIFIED";

  return "generic";
}
