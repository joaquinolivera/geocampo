/**
 * Root redirect — middleware handles the actual redirect logic.
 * Middleware redirects authenticated users to their farm slug and
 * unauthenticated users to /login. This page should rarely render.
 */
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Middleware should have redirected before we get here.
  // Fallback: send to setup (not login, to avoid a redirect loop
  // if middleware has a configuration issue).
  redirect('/setup');
}
