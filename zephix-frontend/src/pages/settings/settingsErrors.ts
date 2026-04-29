import axios from 'axios';

/** Pull server message from axios error after api client unwrap. */
export function getAxiosErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | string | undefined;
    if (typeof data === 'object' && data?.message && typeof data.message === 'string') {
      return data.message;
    }
    if (typeof data === 'string' && data.trim()) {
      return data;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
