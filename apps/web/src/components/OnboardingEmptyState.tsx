'use client';

interface Props {
  onStartDrawing?: () => void;
}

export default function OnboardingEmptyState({ onStartDrawing }: Props) {
  return (
    <div className="mx-4 mt-6 mb-4 rounded-2xl border border-lime/20 bg-lime/5 p-5 flex flex-col items-center text-center">
      {/* Icon */}
      <div className="w-12 h-12 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center text-2xl mb-4">
        🌿
      </div>

      <h2 className="text-white font-bold text-base mb-1">
        ¡Tu campo está listo!
      </h2>
      <p className="text-muted text-xs leading-relaxed mb-5">
        Empezá trazando tu primer potrero directamente en el mapa satelital.
        Solo hacé clic para marcar los vértices.
      </p>

      {onStartDrawing && (
        <button
          onClick={onStartDrawing}
          className="w-full rounded-xl py-2.5 text-sm font-bold text-charcoal transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: '#DEFF9A' }}
        >
          ✏️ Dibujar primer potrero
        </button>
      )}

      {/* Steps hint */}
      <div className="mt-4 w-full space-y-2">
        {[
          ['1', 'Dibujá el polígono en el mapa'],
          ['2', 'Poné nombre y capacidad'],
          ['3', 'Agregá tu rodeo al potrero'],
        ].map(([n, label]) => (
          <div key={n} className="flex items-center gap-2 text-left">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: '#DEFF9A20', color: '#DEFF9A' }}
            >
              {n}
            </span>
            <p className="text-muted text-xs">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
