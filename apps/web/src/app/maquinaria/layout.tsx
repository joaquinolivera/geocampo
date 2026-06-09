'use client';
import { FarmDataProvider } from '@/lib/FarmDataContext';
export default function MaquinariaLayout({ children }: { children: React.ReactNode }) {
  return <FarmDataProvider>{children}</FarmDataProvider>;
}
