'use client';
import { FarmDataProvider } from '@/lib/FarmDataContext';
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <FarmDataProvider>{children}</FarmDataProvider>;
}
