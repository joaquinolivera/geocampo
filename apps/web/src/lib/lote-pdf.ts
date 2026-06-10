/**
 * lote-pdf.ts — Generates a PDF report for a lote comercial.
 * Uses jsPDF + jspdf-autotable (already installed in apps/web).
 *
 * Called entirely client-side; no server involved.
 */

// Dynamic import avoids SSR issues with jsPDF
export async function exportLotePDF(opts: {
  lote: {
    nombre: string;
    descripcion: string | null;
    estado: string;
    fecha_entrada: string;
    fecha_salida: string | null;
    cabezas_entrada: number;
    cabezas_salida: number | null;
    peso_entrada_kg: number | null;
    peso_salida_kg: number | null;
    dias_engorde: number | null;
    costo_entrada: number;
    ingreso_venta: number | null;
    total_gastos: number;
    costo_total: number;
    resultado_neto: number | null;
    resultado_por_cabeza: number | null;
    adg_kg_dia: number | null;
    roi_pct: number | null;
    moneda: string;
  };
  gastos: Array<{
    fecha: string;
    categoria: string;
    descripcion: string | null;
    monto: number;
    moneda: string;
  }>;
  farmName: string;
}): Promise<void> {
  // Dynamic import to avoid SSR crash
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const { lote, gastos, farmName } = opts;
  const currency = lote.moneda;

  function fmt(n: number | null | undefined): string {
    if (n == null) return '—';
    return `${currency} ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function fmtNum(n: number | null | undefined, decimals = 1): string {
    if (n == null) return '—';
    return n.toFixed(decimals);
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  // ── Header ──────────────────────────────────────────────────────────
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(222, 255, 154); // lime
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GeoCampo', 14, y + 4);
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(farmName, 14, y + 10);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Lote Comercial: ${lote.nombre}`, 14, y + 17);
  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${today}`, W - 14, y + 17, { align: 'right' });

  y = 38;

  // ── Status row ───────────────────────────────────────────────────────
  const estadoColor: Record<string, [number, number, number]> = {
    abierto:   [30, 90, 20],
    cerrado:   [20, 40, 100],
    cancelado: [100, 30, 20],
  };
  const [r, g, b] = estadoColor[lote.estado] ?? [60, 60, 60];
  doc.setFillColor(r, g, b);
  doc.roundedRect(14, y, 40, 7, 2, 2, 'F');
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8);
  doc.text(lote.estado.toUpperCase(), 34, y + 4.5, { align: 'center' });

  if (lote.descripcion) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.text(lote.descripcion, 60, y + 4.5);
  }

  y += 14;

  // ── Summary stats ────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('Resumen del período', 14, y);
  y += 5;

  const summaryRows: [string, string][] = [
    ['Período',            `${lote.fecha_entrada} → ${lote.fecha_salida ?? 'abierto'}`],
    ['Días en engorde',    lote.dias_engorde ? `${lote.dias_engorde} días` : '—'],
    ['Cabezas entrada',    String(lote.cabezas_entrada)],
    ['Cabezas salida',     lote.cabezas_salida != null ? String(lote.cabezas_salida) : '—'],
    ['Peso entrada prom.', lote.peso_entrada_kg != null ? `${fmtNum(lote.peso_entrada_kg)} kg` : '—'],
    ['Peso salida prom.',  lote.peso_salida_kg  != null ? `${fmtNum(lote.peso_salida_kg)} kg`  : '—'],
    ['GPD (ADG)',          lote.adg_kg_dia      != null ? `${fmtNum(lote.adg_kg_dia, 2)} kg/día` : '—'],
    ['Costo de entrada',   fmt(lote.costo_entrada)],
    ['Total gastos',       fmt(lote.total_gastos)],
    ['Costo total',        fmt(lote.costo_total)],
    ['Ingreso por venta',  fmt(lote.ingreso_venta)],
    ['Resultado neto',     fmt(lote.resultado_neto)],
    ['Resultado/cabeza',   fmt(lote.resultado_por_cabeza)],
    ['ROI',                lote.roi_pct != null ? `${fmtNum(lote.roi_pct, 1)}%` : '—'],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: summaryRows,
    theme: 'plain',
    styles:          { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { textColor: [100, 100, 100], fontStyle: 'bold', cellWidth: 60 },
      1: { textColor: [30,  30,  30]  },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-expect-error jspdf-autotable adds lastAutoTable
  y = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // ── Gastos table ──────────────────────────────────────────────────────
  if (gastos.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Detalle de gastos', 14, y);
    y += 4;

    const LABELS: Record<string, string> = {
      sanidad:         'Sanidad',
      alimentacion:    'Alimentación',
      mano_de_obra:    'Mano de obra',
      flete:           'Flete',
      impuesto:        'Impuesto',
      infraestructura: 'Infraestructura',
      otro:            'Otro',
    };

    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Categoría', 'Descripción', 'Monto']],
      body: gastos.map((g) => [
        g.fecha,
        LABELS[g.categoria] ?? g.categoria,
        g.descripcion ?? '',
        `${g.moneda} ${g.monto.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      ]),
      theme: 'striped',
      headStyles:   { fillColor: [20, 20, 20], textColor: [222, 255, 154], fontStyle: 'bold', fontSize: 8 },
      bodyStyles:   { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 36 },
        3: { halign: 'right', cellWidth: 32 },
      },
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `GeoCampo · ${farmName} · Página ${i} de ${pageCount}`,
      W / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`lote-${lote.nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
