'use client';
import { FarmDataProvider } from '@/lib/FarmDataContext';
export default function VeterinariaLayout({ children }: { children: React.ReactNode }) {
  return <FarmDataProvider>{children}</FarmDataProvider>;
}
