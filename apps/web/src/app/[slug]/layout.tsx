'use client';

import { FarmDataProvider } from '@/lib/FarmDataContext';

/**
 * Farm layout — provides farm data to all /[slug] pages.
 * FarmDataProvider loads from localStorage (user's real farm) or falls back to demo data.
 */
export default function FarmLayout({ children }: { children: React.ReactNode }) {
  return <FarmDataProvider>{children}</FarmDataProvider>;
}
