'use client';
import { FarmDataProvider } from '@/lib/FarmDataContext';
export default function LotesLayout({ children }: { children: React.ReactNode }) {
  return <FarmDataProvider>{children}</FarmDataProvider>;
}
