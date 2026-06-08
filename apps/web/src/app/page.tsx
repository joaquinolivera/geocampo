/**
 * Root redirect — middleware handles the actual redirect logic.
 * This page only renders momentarily before the middleware fires.
 */
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Middleware will redirect authenticated users to their farm slug
  // and unauthenticated users to /login.
  // This is a fallback in case middleware doesn't fire (e.g., static export).
  redirect('/login');
}
