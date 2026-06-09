'use client';

/**
 * /team — Team settings page (owner only)
 *
 * - Shows current members with their roles
 * - Allows inviting new members (capataz / empleado)
 * - Allows removing members (except self)
 */

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';

interface Member {
  id: string;
  user_id: string | null;
  email: string;
  role: string;
  accepted_at: string | null;
  invited_at:  string | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner:    'Dueño/a',
  capataz:  'Capataz',
  manager:  'Administrador/a',
  empleado: 'Empleado/a',
  employee: 'Empleado/a',
  vet:      'Veterinario/a',
  viewer:   'Observador/a',
};

const ROLE_BADGE: Record<string, string> = {
  owner:    'bg-lime/20 text-lime',
  capataz:  'bg-blue-500/20 text-blue-300',
  manager:  'bg-blue-500/20 text-blue-300',
  empleado: 'bg-surface2 text-muted',
  employee: 'bg-surface2 text-muted',
  vet:      'bg-purple-500/20 text-purple-300',
  viewer:   'bg-surface2 text-muted',
};

export default function TeamPage() {
  const router = useRouter();
  const { farmId, userRole } = useFarmData();

  const [members, setMembers]       = useState<Member[]>([]);
  const [loading, setLoading]       = useState(true);
  const [inviteEmail, setEmail]     = useState('');
  const [inviteRole, setInviteRole] = useState<'capataz' | 'empleado'>('empleado');
  const [inviteUrl, setInviteUrl]   = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Redirect non-owners away
  useEffect(() => {
    if (!loading && userRole !== null && userRole !== 'owner') {
      router.replace('/');
    }
  }, [userRole, loading, router]);

  // Fetch members
  useEffect(() => {
    async function loadMembers() {
      if (!farmId) return;
      const client = getBrowserClient();
      if (!client) { setLoading(false); return; }

      const { data: { user } } = await client.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data } = await client
        .from('farm_members')
        .select('id, user_id, email, role, accepted_at, invited_at')
        .eq('farm_id', farmId)
        .order('invited_at', { ascending: true });

      setMembers((data ?? []) as Member[]);
      setLoading(false);
    }
    void loadMembers();
  }, [farmId]);

  const handleInvite = () => {
    if (!inviteEmail.trim() || !farmId) return;
    setError(null);
    setInviteUrl(null);

    startTransition(() => { void (async () => {
      const client = getBrowserClient();
      if (!client) return;

      const { data: { session } } = await client.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/team/invite', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ farmId, email: inviteEmail.trim(), role: inviteRole }),
      });

      const json = await res.json() as { inviteUrl?: string; error?: string };

      if (!res.ok) {
        setError(json.error ?? 'Error al enviar invitación.');
        return;
      }

      setInviteUrl(json.inviteUrl ?? null);
      setEmail('');

      // Refresh member list
      const { data } = await client
        .from('farm_members')
        .select('id, user_id, email, role, accepted_at, invited_at')
        .eq('farm_id', farmId)
        .order('invited_at', { ascending: true });
      setMembers((data ?? []) as Member[]);
    })(); });
  };

  const handleRemove = (memberId: string) => {
    startTransition(() => { void (async () => {
      const client = getBrowserClient();
      if (!client || !farmId) return;

      await client.from('farm_members').delete().eq('id', memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    })(); });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-white">
      {/* Header */}
      <div className="border-b border-surface2 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-muted hover:text-white transition-colors text-sm">
          ← Volver
        </Link>
        <h1 className="text-lg font-bold">Equipo</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* Invite form */}
        {userRole === 'owner' && (
          <section>
            <h2 className="text-base font-semibold mb-4">Invitar miembro</h2>
            <div className="rounded-2xl border border-surface2 p-5 space-y-4" style={{ backgroundColor: '#111112' }}>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="flex-1 rounded-xl border border-surface2 bg-surface px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 transition-colors"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'capataz' | 'empleado')}
                  className="rounded-xl border border-surface2 bg-surface px-4 py-3 text-white text-sm focus:outline-none focus:border-lime/50"
                >
                  <option value="capataz">Capataz</option>
                  <option value="empleado">Empleado/a</option>
                </select>
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              {inviteUrl && (
                <div className="rounded-xl border border-lime/30 bg-lime/5 p-3">
                  <p className="text-lime text-xs font-medium mb-1">Enlace de invitación:</p>
                  <p className="text-white text-xs break-all font-mono">{inviteUrl}</p>
                  <button
                    onClick={() => void navigator.clipboard.writeText(inviteUrl)}
                    className="mt-2 text-xs text-lime hover:underline"
                  >
                    Copiar enlace
                  </button>
                </div>
              )}

              <button
                onClick={handleInvite}
                disabled={isPending || !inviteEmail.trim()}
                className="w-full rounded-xl py-3 font-bold text-charcoal text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
                style={{ backgroundColor: '#DEFF9A' }}
              >
                {isPending ? 'Enviando…' : 'Enviar invitación'}
              </button>
            </div>
          </section>
        )}

        {/* Members list */}
        <section>
          <h2 className="text-base font-semibold mb-4">Miembros ({members.length})</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-surface2 px-4 py-3"
                style={{ backgroundColor: '#111112' }}
              >
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{m.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[m.role] ?? 'bg-surface2 text-muted'}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                    {!m.accepted_at && (
                      <span className="text-xs text-amber-400">pendiente</span>
                    )}
                  </div>
                </div>

                {/* Remove button — not for self, not for owner members */}
                {userRole === 'owner' && m.user_id !== currentUserId && m.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    disabled={isPending}
                    className="ml-4 text-muted hover:text-red-400 transition-colors text-sm shrink-0"
                    title="Eliminar miembro"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {members.length === 0 && (
              <p className="text-muted text-sm text-center py-8">No hay miembros aún.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
