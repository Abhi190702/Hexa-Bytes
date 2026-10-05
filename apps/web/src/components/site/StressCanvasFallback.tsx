// Zero-WebGL backdrop for reduced-motion / low-end devices. A static SVG hex
// field tinted with the ESI ramp — same visual language, no animation, no GPU.

export function StressCanvasFallback() {
  // A small honeycomb of hexes coloured along green→amber→red.
  const cols = 9;
  const rows = 7;
  const r = 34;
  const w = Math.sqrt(3) * r;
  const h = r * 1.5;
  const hexes: { x: number; y: number; c: string }[] = [];
  const ramp = ['#27ae60', '#43a847', '#8aa72f', '#d4a017', '#e67e22', '#d65a2a', '#c0392b'];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * w + (row % 2 ? w / 2 : 0);
      const y = row * h;
      // Radial-ish stress toward the centre.
      const dx = (col - cols / 2) / cols;
      const dy = (row - rows / 2) / rows;
      const t = Math.min(1, Math.hypot(dx, dy) * 1.8);
      hexes.push({ x, y, c: ramp[Math.round((1 - t) * (ramp.length - 1))] ?? '#27ae60' });
    }
  }
  const hex = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a0b0d]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(231,76,60,0.10),transparent_60%)]" />
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40"
        width={cols * w + w}
        height={rows * h + h}
        aria-hidden
      >
        {hexes.map((hx, i) => (
          <polygon key={i} points={hex(hx.x + w, hx.y + r)} fill={hx.c} fillOpacity={0.55} />
        ))}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0d] via-transparent to-[#0a0b0d]/70" />
    </div>
  );
}
