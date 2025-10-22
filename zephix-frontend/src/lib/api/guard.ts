export function assertApiPath(url: string): void {
  if (import.meta.env.DEV && /^\/(?!api\/)/.test(url)) {
    console.warn('[API GUARD] Non-/api path detected:', url);
  }
}
