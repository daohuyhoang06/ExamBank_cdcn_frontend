const ERROR_MESSAGE_KEYS = ["message", "error", "detail", "description", "reason", "title"];

function extractStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return null;
}

function extractNestedMessage(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) {
    return null;
  }

  const directMessage = extractStringValue(value);
  if (directMessage) {
    return directMessage;
  }

  if (value instanceof Error) {
    return extractNestedMessage(value.message, depth + 1) ?? extractStringValue(value.name);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractNestedMessage(item, depth + 1);
      if (message) {
        return message;
      }
    }

    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const key of ERROR_MESSAGE_KEYS) {
    const message = extractNestedMessage(record[key], depth + 1);
    if (message) {
      return message;
    }
  }

  const code = extractStringValue(record.code);
  if (code) {
    const nestedMessage = extractNestedMessage(record.message, depth + 1);
    return nestedMessage ? `${code}: ${nestedMessage}` : code;
  }

  for (const key of Object.keys(record)) {
    const message = extractNestedMessage(record[key], depth + 1);
    if (message) {
      return message;
    }
  }

  return null;
}

export function extractApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const message = extractNestedMessage(error);
  return message ?? fallbackMessage;
}