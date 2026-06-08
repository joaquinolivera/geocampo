import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-charcoal gap-6 p-8 text-center">
      <span className="text-6xl">🌾</span>
      <div>
        <h1 className="text-white text-3xl font-bold mb-2">404</h1>
        <p className="text-muted text-base max-w-sm">
          This page doesn&apos;t exist. / Esta página no existe.
        </p>
      </div>
      <Link
        href="/login"
        className="px-6 py-3 rounded-xl font-bold text-charcoal text-sm transition-all hover:brightness-110"
        style={{ backgroundColor: '#DEFF9A' }}
      >
        Go to login →
      </Link>
    </div>
  );
}
