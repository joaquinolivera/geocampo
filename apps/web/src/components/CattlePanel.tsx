'use client';

/**
 * CattlePanel — shows individual animals in a herd.
 * Lists chip IDs, visual tags, sex, breed, status.
 * Includes SINIP export download + add animal modal.
 */

import { useState, useEffect, useCallback } from 'react';
import { listCattle, removeCattle } from '@/lib/farm-store';
import type { StoredCattle } from '@/lib/farm-store';
import AddCattleModal from './AddCattleModal';

interface Props {
  herdId:        string;
  herdName:      string;
  farmId:        string;
  isCustomFarm:  boolean;
  onAnimalClick: (animal: StoredCattle) => void;
}

const STATUS_LABEL: Record<string, string> = {
  active:      'Activo',
  sold:        'Vendido',
  deceased:    'Fallecido',
  transferred: 'Transferido',
};

const STATUS_COLOR: Record<string, string> = {
  active:      '#22c55e',
  sold:        '#f59e0b',
  deceased:    '#6b7280',
  transferred: '#3b82f6',
};

const SEX_LABEL: Record<string, string> = {
  female:    '♀',
  male:      '♂',
  castrated: '✂',
};

export default function CattlePanel({ herdId, herdName, farmId, isCustomFarm, onAnimalClick }: Props) {
  const [cattle,       setCattle]       = useState<StoredCattle[]>([]);
  const [showAdd,      setShowAdd]      = useState(false);
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null);
  const [filter,       setFilter]       = useState('');

  const reload = useCallback(() => {
    setCattle(listCattle(herdId));
  }, [herdId]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = cattle.filter((c) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      c.chipId?.includes(q)      ||
      c.visualTagId?.toLowerCase().includes(q) ||
      c.breed?.toLowerCase().includes(q)       ||
      STATUS_LABEL[c.status]?.toLowerCase().includes(q)
    );
  });

  const handleDelete = (id: string) => {
    removeCattle(id);
    reload();
    setConfirmDel(null);
  };

  const handleSINIPExport = () => {
    const rows: string[][] = [
      ['chipId_DIOB', 'caravana_visual', 'sexo', 'raza', 'fecha_nacimiento', 'estado', 'lote', 'campo'],
    ];
    cattle.forEach((c) => {
      rows.push([
        c.chipId       ?? '',
        c.visualTagId  ?? '',
        c.sex          ?? '',
        c.breed        ?? '',
        c.dob          ?? '',
        c.status,
        herdName,
        farmId,
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `SINIP_${herdName.replace(/\s/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
            📋 Animales individuales
          </span>
          <span style={{ background: '#374151', borderRadius: 9999, padding: '1px 8px', fontSize: 11, color: '#9ca3af' }}>
            {cattle.filter((c) => c.status === 'active').length} activos
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {cattle.length > 0 && (
            <button
              onClick={handleSINIPExport}
              title="Exportar CSV para SENACSA / SINIP"
              style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', color: '#60a5fa', fontSize: 11, cursor: 'pointer' }}
            >
              📤 SINIP
            </button>
          )}
          {isCustomFarm && (
            <button
              onClick={() => setShowAdd(true)}
              style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', color: '#4ade80', fontSize: 11, cursor: 'pointer' }}
            >
              + Agregar animal
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {cattle.length > 3 && (
        <input
          type="text"
          placeholder="Buscar por chip, caravana, raza..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #374151', background: '#111827', color: '#e5e7eb', fontSize: 12, marginBottom: 10, boxSizing: 'border-box' }}
        />
      )}

      {/* Empty state */}
      {cattle.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7280', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🐄</div>
          <p style={{ margin: 0 }}>No hay animales registrados en este lote.</p>
          {isCustomFarm && (
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>
              Usá <strong style={{ color: '#4ade80' }}>+ Agregar animal</strong> para registrar el primer animal con chip DIOB.
            </p>
          )}
          {!isCustomFarm && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#4b5563' }}>
              El tracking individual requiere un campo personalizado.
            </p>
          )}
        </div>
      )}

      {/* Animal list */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((animal) => (
            <div
              key={animal.id}
              onClick={() => onAnimalClick(animal)}
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: '10px 12px',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#374151')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1f2937')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Chip + caravana */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  {animal.chipId ? (
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                      📡 {animal.chipId}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#4b5563', fontStyle: 'italic' }}>sin chip</span>
                  )}
                  {animal.visualTagId && (
                    <span style={{ fontSize: 12, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                      🏷 {animal.visualTagId}
                    </span>
                  )}
                </div>
                {/* Meta row */}
                <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#6b7280' }}>
                  {animal.sex    && <span>{SEX_LABEL[animal.sex] ?? animal.sex}</span>}
                  {animal.breed  && <span>{animal.breed}</span>}
                  {animal.dob    && <span>nac. {animal.dob}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {/* Status badge */}
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 9999,
                  background: `${STATUS_COLOR[animal.status]}22`,
                  color: STATUS_COLOR[animal.status],
                  border: `1px solid ${STATUS_COLOR[animal.status]}44`,
                }}>
                  {STATUS_LABEL[animal.status]}
                </span>

                {/* Delete */}
                {isCustomFarm && (
                  confirmDel === animal.id ? (
                    <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDelete(animal.id)} style={{ padding: '2px 8px', borderRadius: 4, background: '#ef4444', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Eliminar</button>
                      <button onClick={() => setConfirmDel(null)} style={{ padding: '2px 8px', borderRadius: 4, background: '#374151', border: 'none', color: '#aaa', fontSize: 11, cursor: 'pointer' }}>No</button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDel(animal.id); }}
                      style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                    >
                      🗑
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No match for filter */}
      {cattle.length > 0 && filtered.length === 0 && filter && (
        <p style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
          Sin resultados para &ldquo;{filter}&rdquo;
        </p>
      )}

      {/* Add modal */}
      {showAdd && (
        <AddCattleModal
          herdId={herdId}
          herdName={herdName}
          onClose={() => setShowAdd(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
