const SECRET_PATTERNS: RegExp[] = [
  /xox[baprs]-[A-Za-z0-9-]+/gi,
  /sk_live_[A-Za-z0-9]+/gi,
  /sk_test_[A-Za-z0-9]+/gi,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/gi,
  /postgres(?:ql)?:\/\/[^\s]+/gi,
  /mongodb(?:\+srv)?:\/\/[^\s]+/gi,
  /password\s*[=:]\s*[^\s,;]+/gi,
  /pwd\s*[=:]\s*[^\s,;]+/gi,
  /ORACLE_PASSWORD\s*[=:]\s*[^\s,;]+/gi,
  /connectString\s*[=:]\s*[^\s,;]+/gi,
  /ORACLE_CONNECT_STRING\s*[=:]\s*[^\s,;]+/gi,
  /Bearer\s+[A-Za-z0-9._\-]+/gi,
  /api[_-]?key\s*[=:]\s*[^\s,;]+/gi,
  /secret\s*[=:]\s*[^\s,;]+/gi,
  /cookie\s*[=:]\s*[^\s,;]+/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
];

/** Strip credentials and high-entropy tokens from error text before logging or matching. */
export function sanitizeErrorText(input: unknown): string {
  let text =
    input instanceof Error
      ? `${input.name}: ${input.message}`
      : typeof input === 'string'
        ? input
        : String(input ?? '');

  for (const re of SECRET_PATTERNS) {
    text = text.replace(re, '[REDACTED]');
  }

  return text.replace(/\s+/g, ' ').trim();
}
