/**
 * @fileoverview Client-side PDF farm summary export.
 *
 * Uses jsPDF + jspdf-autotable — runs entirely in the browser.
 * Called from ExportMenu.
 */

import type { FarmDataShape } from './FarmDataContext';

const LIME   = [222, 255, 154] as [number, number, number]; // #DEFF9A
const DARK   = [10,  10,  11]  as [number, number, number]; // #0A0A0B
const MUTED  = [106, 106, 107] as [number, number, number]; // #6A6A6B
const WHITE  = [255, 255, 255] as [number, number, number];
const SURFACE2 = [42, 42, 43] as [number, number, number]; // #2A2A2B

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-PY', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const TREATMENT_LABELS: Record<string, string> = {
  vaccination: 'Vacunación',
  deworming:   'Desparasitación',
  medication:  'Tratamiento',
  checkup:     'Revisación',
  surgery:     'Cirugía',
  other:       'Otro',
};

export async function exportFarmPdf(data: FarmDataShape): Promise<void> {
  // Dynamic import so jsPDF is not bundled in the initial chunk
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const { DEMO_FARM, PASTURES, HERDS, WEIGHTS, HEALTH_RECORDS } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = doc.internal.pageSize.getWidth();
  let y = 0;

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 28, 'F');

  doc.setFontSize(18);
  doc.setTextColor(...LIME);
  doc.setFont('helvetica', 'bold');
  doc.text('🌿 GeoCampo', 14, 12);

  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'normal');
  doc.text(DEMO_FARM.name, 14, 20);

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Generado el ${fmtDate(new Date())} · ${DEMO_FARM.ownerName}`, 14, 26);

  y = 36;

  // ── Summary row ───────────────────────────────────────────────────────────
  const totalCattle = HERDS.reduce((s, h) => s + h.cattleCount, 0);
  const summaryItems = [
    ['Potreros', String(PASTURES.length)],
    ['Rodeos', String(HERDS.length)],
    ['Cabezas', String(totalCattle)],
    ['Superficie', `${DEMO_FARM.totalAreaHectares.toFixed(0)} ha`],
  ];

  const cellW = (W - 28) / summaryItems.length;
  summaryItems.forEach(([label, value], i) => {
    const x = 14 + i * cellW;
    doc.setFillColor(...SURFACE2);
    doc.roundedRect(x, y, cellW - 2, 14, 2, 2, 'F');
    doc.setFontSize(14);
    doc.setTextColor(...LIME);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + cellW / 2 - 1, y + 8, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + cellW / 2 - 1, y + 13, { align: 'center' });
  });

  y += 22;

  // ── Pastures table ────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(...LIME);
  doc.setFont('helvetica', 'bold');
  doc.text('Potreros', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Nombre', 'Área (ha)', 'Cap. (cab.)', 'Pasturas', 'Agua']],
    body: PASTURES.map((p) => [
      p.name,
      p.areaHectares.toFixed(1),
      p.carryingCapacity > 0 ? String(p.carryingCapacity) : '—',
      p.grassType ?? '—',
      p.waterSupply ?? '—',
    ]),
    headStyles: { fillColor: DARK, textColor: LIME, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [220, 220, 220] as [number,number,number] },
    alternateRowStyles: { fillColor: [20, 20, 21] as [number,number,number] },
    styles: { fillColor: [15, 15, 16] as [number,number,number], lineColor: SURFACE2, lineWidth: 0.1 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── Herds table ───────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(...LIME);
  doc.setFont('helvetica', 'bold');
  doc.text('Rodeos', 14, y);
  y += 4;

  const pastureMap = new Map(PASTURES.map((p) => [p.id, p.name]));

  autoTable(doc, {
    startY: y,
    head: [['Rodeo', 'Potrero', 'Cabezas', 'Raza']],
    body: HERDS.map((h) => [
      h.name,
      pastureMap.get(h.pastureId) ?? '—',
      String(h.cattleCount),
      h.breed || '—',
    ]),
    headStyles: { fillColor: DARK, textColor: LIME, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [220, 220, 220] as [number,number,number] },
    alternateRowStyles: { fillColor: [20, 20, 21] as [number,number,number] },
    styles: { fillColor: [15, 15, 16] as [number,number,number], lineColor: SURFACE2, lineWidth: 0.1 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── Recent weight records (last 20) ───────────────────────────────────────
  const recentWeights = WEIGHTS.slice()
    .sort((a, b) => b.weighedAt.getTime() - a.weighedAt.getTime())
    .slice(0, 20);

  if (recentWeights.length > 0) {
    // New page if not enough room
    if (y > 220) { doc.addPage(); y = 16; }

    doc.setFontSize(10);
    doc.setTextColor(...LIME);
    doc.setFont('helvetica', 'bold');
    doc.text('Últimos pesajes', 14, y);
    y += 4;

    const herdMap = new Map(HERDS.map((h) => [h.id, h.name]));

    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Rodeo', 'Cabezas', 'Peso prom. (kg)', 'Peso total (kg)']],
      body: recentWeights.map((w) => [
        fmtDate(w.weighedAt),
        herdMap.get(w.herdId) ?? '—',
        String(w.cattleCount),
        w.averageWeightKg.toFixed(1),
        (w.cattleCount * w.averageWeightKg).toFixed(0),
      ]),
      headStyles: { fillColor: DARK, textColor: LIME, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [220, 220, 220] as [number,number,number] },
      alternateRowStyles: { fillColor: [20, 20, 21] as [number,number,number] },
      styles: { fillColor: [15, 15, 16] as [number,number,number], lineColor: SURFACE2, lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // ── Recent health records (last 20) ───────────────────────────────────────
  const recentHealth = HEALTH_RECORDS.slice()
    .sort((a, b) => b.administeredAt.getTime() - a.administeredAt.getTime())
    .slice(0, 20);

  if (recentHealth.length > 0) {
    if (y > 220) { doc.addPage(); y = 16; }

    doc.setFontSize(10);
    doc.setTextColor(...LIME);
    doc.setFont('helvetica', 'bold');
    doc.text('Últimos registros sanitarios', 14, y);
    y += 4;

    const herdMap = new Map(HERDS.map((h) => [h.id, h.name]));

    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Rodeo', 'Tipo', 'Producto', 'Próx. venc.']],
      body: recentHealth.map((r) => [
        fmtDate(r.administeredAt),
        herdMap.get(r.herdId) ?? '—',
        TREATMENT_LABELS[r.treatmentType] ?? r.treatmentType,
        r.productName ?? '—',
        r.nextDueDate ? fmtDate(r.nextDueDate) : '—',
      ]),
      headStyles: { fillColor: DARK, textColor: LIME, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [220, 220, 220] as [number,number,number] },
      alternateRowStyles: { fillColor: [20, 20, 21] as [number,number,number] },
      styles: { fillColor: [15, 15, 16] as [number,number,number], lineColor: SURFACE2, lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`GeoCampo — ${DEMO_FARM.name} — Página ${i} de ${pageCount}`, W / 2, h - 6, { align: 'center' });
  }

  doc.save(`geocampo-resumen-${new Date().toISOString().slice(0, 10)}.pdf`);
}
