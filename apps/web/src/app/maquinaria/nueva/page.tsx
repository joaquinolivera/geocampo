'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';

const inputCls = 'w-full rounded-xl border border-surface2 bg-surface px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white text-sm font-medium mb-2">{label}</label>
      {children}
    </div>
  );
}

export default function NuevaMaquinaPage() {
  const router = useRouter();
  const { farmId } = useFarmData();

  const [name,       setName]      = useState('');
  const [type,       setType]      = useState('tractor');
  const [brand,      setBrand]     = useState('');
  const [model,      setModel]     = useState('');
  const [year,       setYear]      = useState('');
  const [horometro,  setHorometro] = useState('0');
  const [purchasePrice, setPrice]  = useState('');
  const [purchaseDate,  setDate]   = useState('');
  const [vidaUtil,   setVidaUtil]  = useState('10');
  const [notes,      setNotes]     = useState('');
  const [error,      setError]     = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !farmId) { setError('El nombre es obligatorio.'); return; }

    startTransition(() => { void (async () => {
      const client = getBrowserClient();
      if (!client) { setError('Supabase no disponible.'); return; }

      const { data, error: err } = await client
        .from('machinery')
        .insert({
          farm_id:           farmId,
          name:              name.trim(),
          type,
          brand:             brand.trim() || null,
          model:             model.trim() || null,
          year:              year ? parseInt(year, 10) : null,
          horometro_inicial: parseFloat(horometro) || 0,
          horometro_actual:  parseFloat(horometro) || 0,
          purchase_price:    purchasePrice ? parseFloat(purchasePrice) : null,
          purchase_date:     purchaseDate || null,
          vida_util_años:    parseInt(vidaUtil, 10) || 10,
          notes:             notes.trim() || null,
        })
        .select('id')
        .single();

      if (err || !data) { setError(err?.message ?? 'Error al crear.'); return; }
      router.push(`/maquinaria/${data.id}`);
    })(); });
  };

  return (
    <div className="min-h-screen bg-charcoal text-white">
      <div className="border-b border-surface2 px-6 py-4 flex items-center gap-4">
        <Link href="/maquinaria" className="text-muted hover:text-white text-sm">← Maquinaria</Link>
        <h1 className="text-lg font-bold">Nueva máquina</h1>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Nombre *">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tractor John Deere 5090" className={inputCls} />
          </Field>

          <Field label="Tipo">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {['tractor','cosechadora','sembradora','pulverizadora','camion','camioneta','acoplado','implemento','otro'].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Marca">
              <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="John Deere" className={inputCls} />
            </Field>
            <Field label="Modelo">
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="5090E" className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Año">
              <input type="number" min="1950" max="2100" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2018" className={inputCls} />
            </Field>
            <Field label="Horómetro actual (hs)">
              <input type="number" step="0.1" min="0" value={horometro} onChange={(e) => setHorometro(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor de compra (ARS)">
              <input type="number" step="0.01" min="0" value={purchasePrice} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className={inputCls} />
            </Field>
            <Field label="Fecha de compra">
              <input type="date" value={purchaseDate} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Vida útil (años)">
            <input type="number" min="1" max="50" value={vidaUtil} onChange={(e) => setVidaUtil(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Notas">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observaciones…" className={`${inputCls} resize-none`} />
          </Field>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl py-3 font-bold text-charcoal text-sm disabled:opacity-50 hover:brightness-110 transition-all"
            style={{ backgroundColor: '#DEFF9A' }}
          >
            {isPending ? 'Guardando…' : 'Registrar máquina'}
          </button>
        </form>
      </div>
    </div>
  );
}
