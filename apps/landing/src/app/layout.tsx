import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:       'GeoCampo — Gestión ganadera inteligente',
  description: 'Plataforma SaaS para ganaderos. Mapa satelital, seguimiento de hacienda, salud animal, ERP completo y asistente IA. Funciona offline.',
  openGraph: {
    title:       'GeoCampo',
    description: 'Gestión ganadera inteligente — offline-first, multi-estancia, con IA',
    siteName:    'GeoCampo',
    type:        'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
