export default function Loading() {
  return (
    <div className="h-screen flex items-center justify-center bg-charcoal">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="w-10 h-10 border-3 border-surface2 border-t-lime rounded-full animate-spin" />
        <p className="text-muted text-sm">GeoCampo</p>
      </div>
    </div>
  );
}
