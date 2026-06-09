// Type shim — jspdf 2.x ships its own declarations once installed via pnpm.
// This stub prevents tsc errors before `pnpm install` is run.
declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: { orientation?: string; unit?: string; format?: string });
    internal: { pageSize: { getWidth(): number; getHeight(): number } };
    setFillColor(r: number, g: number, b: number): this;
    setTextColor(r: number, g: number, b: number): this;
    setFontSize(size: number): this;
    setFont(name: string, style: string): this;
    rect(x: number, y: number, w: number, h: number, style?: string): this;
    roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string): this;
    text(text: string, x: number, y: number, options?: { align?: string }): this;
    line(x1: number, y1: number, x2: number, y2: number): this;
    addPage(): this;
    setPage(n: number): this;
    getNumberOfPages(): number;
    save(filename: string): void;
  }
  export default jsPDF;
}
