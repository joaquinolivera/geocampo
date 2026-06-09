// Type shim — jspdf-autotable includes its own types once installed via pnpm.
// This stub prevents tsc errors before `pnpm install` is run.
declare module 'jspdf-autotable' {
  import type { jsPDF } from 'jspdf';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function autoTable(doc: jsPDF, options: Record<string, any>): void;
  export default autoTable;
}
