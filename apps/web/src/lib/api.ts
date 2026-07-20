/**
 * Prepends the app's basePath to an API path so client-side fetch calls
 * resolve correctly when Next.js is configured with basePath: '/app'.
 *
 * Usage:  fetch(apiPath('/api/farms'), ...)
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/app';

export function apiPath(path: string): string {
  return `${BASE_PATH}${path}`;
}
