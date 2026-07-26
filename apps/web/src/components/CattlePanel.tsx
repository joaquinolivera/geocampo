'use client';

/**
 * CattlePanel — individual animal list for a herd.
 * Production: reads from FarmDataContext (Supabase-backed).
 * Demo mode: falls back to localStorage via farm-store.
 */

import { useState, useCallback } from 'react';
import { useFarmData, type CattleRecord } from '@/lib/FarmDataContext';
import { IS_DEMO_MODE } from '@/lib/supabase';
import { listCattle, removeCattle } from '@/lib/farm-store';
import type { StoredCattle } from '@/lib/farm-store';
import AddCattleModal from './AddCattleModal';

import type { HerdSpecies } from '@/lib/data';

interface Props {
  herdId:        string;
  herdName:      string;
  farmId:        string;
  herdSpecies:   HerdSpecies;
  isCustomFarm:  boolean;
  onAnimalClick: (animal: CattleRecord | StoredCattle) => void;
}

const STATUS_LABEL: Record<string, string> = {
  active:      'Activo',
  sold:        'Vendido',
  deceased:    'Fallecido',
  transferred: 'Transferido',
};
const STATUS_COLOR: Record<string, string> = {
  active:      '#84cc16',
  sold:        '#f59e0b',
  deceased:    '#6b7280',
  transferred: '#3b82f6',
};
const SEX_LABEL: Record<string, string> = {
  female:    '♀',
  male:      '♂',
  castrated: '✂',
};
const CATEGORY_LABEL: Record<string, string> = {
  // Bovinos
  vaca:       'Vaca',
  vaquillona: 'Vaquillona',
  ternera:    'Ternera',
  toro:       'Toro',
  novillo:    'Novillo',
  ternero:    'Ternero',
  torito:     'Torito',
  // Ovinos
  oveja:   'Oveja',
  carnero: 'Carnero',
  borrega: 'Borrega',
  borrego: 'Borrego',
  cordera: 'Cordera',
  cordero: 'Cordero',
  capon:   'Capón',
};

const SPECIES_PANEL_CONFIG: Record<string, {
  icon:        string;
  panelTitle:  string;
  exportLabel: string;
  exportIcon:  string;
}> = {
  bovino: { icon: '🐄', panelTitle: 'Animales individuales (DIOB)',    exportLabel: 'SINIP', exportIcon: '📤' },
  ovino:  { icon: '🐑', panelTitle: 'Animales individuales (Ovinos)',   exportLabel: 'SENASA', exportIcon: '📤' },
  default:{ icon: '🐾', panelTitle: 'Animales individuales',            exportLabel: 'Exportar', exportIcon: '📤' },
};

export default function CattlePanel({ herdId, herdName, farmId, herdSpecies, isCustomFarm, onAnimalClick }: Props) {
  const panelCfg = SPECIES_PANEL_CONFIG[herdSpecies] ?? SPECIES_PANEL_CONFIG.default;
  const { CATTLE, refresh } = useFarmData();
  const [showAdd,    setShowAdd]    = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [filter,     setFilter]     = useState('');
  const [deleting,   setDeleting]   = useState(false);

  // In demo mode, fall back to localStorage
  const demoCattle: StoredCattle[] = IS_DEMO_MODE ? listCattle(herdId) : [];

  // In production, filter context cattle by herd
  const cattle: CattleRecord[] = IS_DEMO_MODE
    ? []
    : CATTLE.filter((c) => c.herdId === herdId);

  // Unified count
  const allCattle = IS_DEMO_MODE ? demoCattle : cattle;

  const filtered = allCattle.filter((c) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    if (IS_DEMO_MODE) {
      const d = c as StoredCattle;
      return (
        d.chipId?.includes(q) ||
        d.visualTagId?.toLowerCase().includes(q) ||
        d.breed?.toLowerCase().includes(q)
      );
    }
    const p = c as CattleRecord;
    return (
      p.chipId?.toLowerCase().includes(q) ||
      p.visualTagId?.toLowerCase().includes(q) ||
      p.breed?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.ownerName?.toLowerCase().includes(q)
    );
  });

  const handleSINIPExport = () => {
    const rows: string[][] = [
      ['caravana_visual', 'chipId_DIOB', 'categoria', 'sexo', 'raza', 'fecha_nacimiento', 'propietario', 'estado', 'lote', 'campo'],
    ];
    allCattle.forEach((c) => {
      if (IS_DEMO_MODE) {
        const d = c as StoredCattle;
        rows.push([d.visualTagId ?? '', d.chipId ?? '', '', d.sex ?? '', d.breed ?? '', d.dob ?? '', '', d.status, herdName, farmId]);
      } else {
        const p = c as CattleRecord;
        rows.push([p.visualTagId ?? '', p.chipId ?? '', CATEGORY_LABEL[p.category ?? ''] ?? '', p.sex ?? '', p.breed ?? '', p.dob ?? '', p.ownerName ?? '', p.status, herdName, farmId]);
      }
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `SINIP_${herdName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = useCallback(async (id: string) => {
    if (IS_DEMO_MODE) {
      removeCattle(id);
      setConfirmDel(null);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/cattle/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      refresh();
    } catch {
      // silent — could show a toast here
    } finally {
      setDeleting(false);
      setConfirmDel(null);
    }
  }, [refresh]);

  const handleSaved = useCallback(() => {
    if (!IS_DEMO_MODE) refresh();
  }, [refresh]);

  const activeCount = allCattle.filter((c) => c.status === 'active').length;

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-200">{panelCfg.icon} {panelCfg.panelTitle}</span>
          <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs text-muted">{activeCount} activos</span>
        </div>
        <div className="flex gap-1.5">
          {allCattle.length > 0 && (
            <button
              onClick={handleSINIPExport}
              title={`Exportar CSV — ${panelCfg.exportLabel}`}
              className="px-2.5 py-1 rounded-md text-xs border border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              {panelCfg.exportIcon} {panelCfg.exportLabel}
            </button>
          )}
          {isCustomFarm && (
            <button
              onClick={() => setShowAdd(true)}
              className="px-2.5 py-1 rounded-md text-xs border border-lime/40 bg-lime/10 text-lime hover:bg-lime/20 transition-colors"
            >
              + Agregar
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {allCattle.length > 3 && (
        <input
          type="text"
          placeholder="Buscar por caravana, chip, raza, propietario..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full mb-2.5 px-3 py-1.5 rounded-lg border border-surface2 bg-surface text-sm text-white placeholder-muted focus:border-lime/40 focus:outline-none"
        />
      )}

      {/* Empty state */}
      {allCattle.length === 0 && (
        <div className="text-center py-6">
          <div className="text-3xl mb-2">{panelCfg.icon}</div>
          <p className="text-sm text-muted">No hay animales registrados en este lote.</p>
          {isCustomFarm && (
            <p className="text-xs text-muted/70 mt-1">
              Usá <strong className="text-lime">+ Agregar</strong> para registrar el primer animal.
            </p>
          )}
        </div>
      )}

      {/* Animal list */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {filtered.map((animal) => {
            const isDemo = IS_DEMO_MODE;
            const vid    = isDemo ? (animal as StoredCattle).visualTagId  : (animal as CattleRecord).visualTagId;
            const chip   = isDemo ? (animal as StoredCattle).chipId       : (animal as CattleRecord).chipId;
            const sexVal = isDemo ? (animal as StoredCattle).sex          : (animal as CattleRecord).sex;
            const breedV = isDemo ? (animal as StoredCattle).breed        : (animal as CattleRecord).breed;
            const catRaw = isDemo ? null : ((animal as CattleRecord).sheepCategory ?? (animal as CattleRecord).category);
            const catV   = catRaw;
            const ownV   = isDemo ? null                                   : (animal as CattleRecord).ownerName;
            const dobV   = isDemo ? (animal as StoredCattle).dob          : (animal as CattleRecord).dob;

            return (
              <div
                key={animal.id}
                onClick={() => onAnimalClick(animal)}
                className="rounded-lg border border-surface2 px-3 py-2.5 cursor-pointer hover:border-surface transition-colors flex justify-between items-center"
                style={{ backgroundColor: '#0d0d0e' }}
              >
                <div className="flex-1 min-w-0">
                  {/* VID + chip row */}
                  <div className="flex items-center gap-2 mb-1">
                    {vid && (
                      <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                        🏷 {vid}
                      </span>
                    )}
                    {chip && (
                      <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                        📡 {chip}
                      </span>
                    )}
                    {!vid && !chip && (
                      <span className="text-xs text-muted italic">sin identificación</span>
                    )}
                  </div>
                  {/* Meta row */}
                  <div className="flex flex-wrap gap-2 text-xs text-muted">
                    {catV && <span className="font-medium text-gray-400">{CATEGORY_LABEL[catV] ?? catV}</span>}
                    {sexVal && <span>{SEX_LABEL[sexVal] ?? sexVal}</span>}
                    {breedV && <span>{breedV}</span>}
                    {dobV && <span>nac. {dobV}</span>}
                    {ownV && <span className="text-lime/70">👤 {ownV}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status badge */}
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      color: STATUS_COLOR[animal.status],
                      backgroundColor: `${STATUS_COLOR[animal.status]}22`,
                      borderColor: `${STATUS_COLOR[animal.status]}44`,
                    }}
                  >
                    {STATUS_LABEL[animal.status]}
                  </span>

                  {/* Delete */}
                  {isCustomFarm && (
                    confirmDel === animal.id ? (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(animal.id)}
                          disabled={deleting}
                          className="px-2 py-1 rounded bg-critical text-white text-xs"
                        >
                          Eliminar
                        </button>
                        <button
                          onClick={() => setConfirmDel(null)}
                          className="px-2 py-1 rounded bg-surface2 text-muted text-xs"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDel(animal.id); }}
                        className="text-muted hover:text-critical text-sm transition-colors"
                      >
                        🗑
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No filter match */}
      {allCattle.length > 0 && filtered.length === 0 && filter && (
        <p className="text-muted text-xs text-center py-3">
          Sin resultados para &ldquo;{filter}&rdquo;
        </p>
      )}

      {/* Add modal */}
      {showAdd && (
        <AddCattleModal
          farmId={farmId}
          herdId={herdId}
          herdName={herdName}
          herdSpecies={herdSpecies}
          onClose={() => setShowAdd(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
