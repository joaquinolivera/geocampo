'use client';
import { FarmDataProvider } from '@/lib/FarmDataContext';
export default function MovimientosLayout({ children }: { children: React.ReactNode }) {
  return <FarmDataProvider>{children}</FarmDataProvider>;
}
