'use client';

/**
 * /farms — Farm selector
 *
 * Lists all farms the current user has accepted membership in.
 * Lets them pick one to navigate into.
 * Falls back gracefully for localStorage (single-farm) users.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient, IS_DEMO_MODE } from '@/lib/supabase';
import { loadStoredFarm } from '@/lib/farm-store';

interface FarmOption {
  id:     string;
  slug:   string;
  name:   string;
  role:   string;
}

export default function FarmsPage() {
  const router = useRouter();
  const [farms,   setFarms]   = useState<FarmOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // localStorage path
      if (IS_DEMO_MODE) {
        const stored = loadStoredFarm();
        if (stored) {
          const slug = (stored as { slug?: string }).slug;
          if (slug) { router.replace(`/${slug}`); return; }
        }
        setLoading(false);
        return;
      }

      const client = getBrowserClient();
      if (!client) { setLoading(false); return; }

      const { data: { user } } = await client.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data } = await client
        .from('farm_members')
        .select('role, farms(id, slug, name)')
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null);

      interface MembershipRow {
        role: string;
        farms: { id: string; slug: string; name: string } | null;
      }

      const options: FarmOption[] = ((data ?? []) as MembershipRow[])
        .filter((m) => m.farms)
        .map((m) => ({
          id:   m.farms!.id,
          slug: m.farms!.slug,
          name: m.farms!.name,
          role: m.role,
        }));

      // If there's exactly one farm, redirect straight into it
      if (options.length === 1) {
        router.replace(`/${options[0].slug}`);
        return;
      }

      setFarms(options);
      setLoading(false);
    }
    void load();
  }, [router]);

  const ROLE_LABELS: Record<string, string> = {
    owner:    'Dueño/a',
    capataz:  'Capataz',
    manager:  'Admin.',
    empleado: 'Empleado/a',
    vet:      'Veterinario/a',
    viewer:   'Observador/a',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="text-4xl mb-3">🌿</div>
          <h1 className="text-lime font-bold text-2xl tracking-tight">GeoCampo</h1>
          <p className="text-muted text-sm mt-1">Seleccioná un campo</p>
        </div>

        {farms.length === 0 ? (
          <div className="text-center space-y-4">
            <p className="text-muted text-sm">No tenés campos asociados aún.</p>
            <a
              href="/setup"
              className="inline-block rounded-xl px-6 py-3 font-bold text-charcoal text-sm hover:brightness-110 transition-all"
              style={{ backgroundColor: '#DEFF9A' }}
            >
              Crear mi campo →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {farms.map((f) => (
              <button
                key={f.id}
                onClick={() => router.push(`/${f.slug}`)}
                className="w-full rounded-2xl border border-surface2 px-6 py-4 flex items-center gap-4 text-left hover:border-lime/30 hover:bg-lime/5 transition-all"
                style={{ backgroundColor: '#111112' }}
              >
                <div className="w-12 h-12 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center text-2xl shrink-0">
                  🌾
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{f.name}</p>
                  <p className="text-muted text-xs mt-0.5">
                    {ROLE_LABELS[f.role] ?? f.role}
                  </p>
                </div>
                <span className="text-muted text-sm shrink-0">→</span>
              </button>
            ))}

            <a
              href="/setup"
              className="block w-full rounded-2xl border border-dashed border-surface2 px-6 py-4 text-center text-muted text-sm hover:border-lime/30 hover:text-lime transition-colors"
            >
              + Crear nuevo campo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
