import axios from 'axios';

export function getErrorText(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as unknown;
    const msg = d?.message ?? err.message ?? 'Request failed';
    return typeof msg === 'string' ? msg : JSON.stringify(d);
  }
  try {
    return typeof err === 'string' ? err : JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}
