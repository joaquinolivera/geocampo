'use client';

/**
 * /lotes/nuevo — Open a new lote comercial
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';

export default function NuevoLotePage() {
  const router = useRouter();
  const { farmId, HERDS } = useFarmData();

  const [nombre,       setNombre]       = useState('');
  const [descripcion,  setDesc]         = useState('');
  const [fechaEntrada, setFechaEntrada] = useState(new Date().toISOString().slice(0, 10));
  const [cabezas,      setCabezas]      = useState('');
  const [pesoEntrada,  setPeso]         = useState('');
  const [costoEntrada, setCosto]        = useState('');
  const [moneda,       setMoneda]       = useState<'USD' | 'ARS' | 'PYG' | 'BRL'>('USD');
  const [herdId,       setHerdId]       = useState<string>('');
  const [error,        setError]        = useState<string | null>(null);
  const [isPending,    startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!farmId) {
      setError('Sesión no encontrada. Recargá la página o iniciá sesión.');
      return;
    }
    if (!nombre.trim() || !cabezas) {
      setError('Nombre y cantidad de cabezas son obligatorios.');
      return;
    }

    startTransition(() => { void (async () => {
      const client = getBrowserClient();
      if (!client) { setError('Supabase no disponible.'); return; }

      const { data: { user } } = await client.auth.getUser();

      const { data, error: insertErr } = await client
        .from('lotes_comerciales')
        .insert({
          farm_id:         farmId,
          nombre:          nombre.trim(),
          descripcion:     descripcion.trim() || null,
          fecha_entrada:   fechaEntrada,
          cabezas_entrada: parseInt(cabezas, 10),
          peso_entrada_kg: pesoEntrada ? parseFloat(pesoEntrada) : null,
          costo_entrada:   costoEntrada ? parseFloat(costoEntrada) : 0,
          moneda,
          herd_id:         herdId || null,
          created_by:      user?.id,
        })
        .select('id')
        .single();

      if (insertErr || !data) {
        setError(insertErr?.message ?? 'Error al crear el lote.');
        return;
      }

      router.push(`/lotes/${data.id}`);
    })(); });
  };

  return (
    <div className="min-h-screen bg-charcoal text-white">
      <div className="border-b border-surface2 px-6 py-4 flex items-center gap-4">
        <Link href="/lotes" className="text-muted hover:text-white transition-colors text-sm">← Lotes</Link>
        <h1 className="text-lg font-bold">Nuevo lote comercial</h1>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Nombre del lote *">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Novillos Mayo 2026"
              className={inputCls}
            />
          </Field>

          <Field label="Descripción (opcional)">
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Raza, origen, observaciones…"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha de entrada *">
              <input
                type="date"
                value={fechaEntrada}
                onChange={(e) => setFechaEntrada(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Cabezas *">
              <input
                type="number"
                min="1"
                value={cabezas}
                onChange={(e) => setCabezas(e.target.value)}
                placeholder="200"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Peso promedio entrada (kg)">
              <input
                type="number"
                step="0.1"
                min="0"
                value={pesoEntrada}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="180"
                className={inputCls}
              />
            </Field>

            <Field label="Moneda">
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as 'USD' | 'ARS' | 'PYG' | 'BRL')}
                className={inputCls}
              >
                <option value="USD">USD — Dólar</option>
                <option value="ARS">ARS — Peso argentino</option>
                <option value="PYG">PYG — Guaraní</option>
                <option value="BRL">BRL — Real</option>
              </select>
            </Field>
          </div>

          {/* Herd link — optional */}
          {HERDS.length > 0 && (
            <Field label="Rodeo / hacienda (opcional)">
              <select
                value={herdId}
                onChange={(e) => setHerdId(e.target.value)}
                className={inputCls}
              >
                <option value="">— Sin rodeo asociado —</option>
                {HERDS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.cattleCount} cabezas)
                  </option>
                ))}
              </select>
              <p className="text-muted text-xs mt-1">Vincula el lote a un rodeo existente para trazabilidad.</p>
            </Field>
          )}

          <Field label={`Costo de compra total (${moneda})`}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costoEntrada}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </Field>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl py-3 font-bold text-charcoal text-sm transition-all disabled:opacity-50 hover:brightness-110"
            style={{ backgroundColor: '#DEFF9A' }}
          >
            {isPending ? 'Creando lote…' : 'Abrir lote'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-surface2 bg-surface px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white text-sm font-medium mb-2">{label}</label>
      {children}
    </div>
  );
}
