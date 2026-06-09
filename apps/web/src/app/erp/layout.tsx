'use client';
import { FarmDataProvider } from '@/lib/FarmDataContext';
export default function ERPLayout({ children }: { children: React.ReactNode }) {
  return <FarmDataProvider>{children}</FarmDataProvider>;
}
