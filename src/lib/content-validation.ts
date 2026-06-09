interface SupabaseLikeError {
  code?: string | null;
  message: string;
}

const isDisallowedControlCode = (code: number) =>
  (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;

export const normalizedCharCount = (value: string) => Array.from(value.trim()).length;

export const assertNoDisallowedControlChars = (value: string, fieldName: string) => {
  for (const char of value) {
    if (isDisallowedControlCode(char.charCodeAt(0))) {
      throw new Error(`${fieldName} contains unsupported control characters.`);
    }
  }
};

export const normalizeTextInput = (value: string, fieldName: string) => {
  assertNoDisallowedControlChars(value, fieldName);
  return value.trim();
};

export const getSupabaseErrorMessage = (error: SupabaseLikeError, fallbackMessage: string) => {
  if (error.code === "PGRST116") {
    return fallbackMessage;
  }

  return error.message;
};
