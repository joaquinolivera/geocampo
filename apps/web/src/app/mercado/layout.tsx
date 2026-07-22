'use client';
import { FarmDataProvider } from '@/lib/FarmDataContext';
export default function MercadoLayout({ children }: { children: React.ReactNode }) {
  return <FarmDataProvider>{children}</FarmDataProvider>;
}
