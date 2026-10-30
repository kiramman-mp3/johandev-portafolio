// Pintor del cielo compartido por la intro y el fondo del sitio.
// Todo lo estático (la Vía Láctea) se pinta una vez en un canvas aparte.

export interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  appear: number;
  twinkle: number;
  phase: number;
}

// Estrellas sueltas repartidas al azar; appearWindow es el tiempo en el que se van encendiendo
export function createStars(width: number, height: number, areaPerStar: number, appearWindow = 0): Star[] {
  const count = Math.round((width * height) / areaPerStar);
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() < 0.9 ? 0.3 + Math.random() * 0.8 : 1 + Math.random() * 0.8,
    alpha: 0.35 + Math.random() * 0.65,
    appear: Math.random() * appearWindow,
    twinkle: 0.15 + Math.random() * 0.25,
    phase: Math.random() * Math.PI * 2
  }));
}

// Banda de la Vía Láctea: resplandor, polvo oscuro, nubes de estrellas y estrellas brillantes
export function paintMilkyWay(width: number, height: number, dpr: number): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = Math.round(width * dpr);
  off.height = Math.round(height * dpr);
  const ctx = off.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // Banda diagonal, de abajo a la izquierda hacia arriba a la derecha
  const x0 = width * -0.1, y0 = height * 1.0;
  const x1 = width * 1.1, y1 = height * 0.0;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const spread = Math.min(width, height) * 0.2;

  // Variación suave a lo largo de la banda: da nubes más densas y zonas más pobres
  const k = [Math.random() * 6, Math.random() * 6, Math.random() * 6];
  const patch = (p: number) =>
    0.55 + 0.25 * Math.sin(p * 13 + k[0]) + 0.12 * Math.sin(p * 31 + k[1]) + 0.08 * Math.sin(p * 5 + k[2]);
  // El centro de la banda ondula un poco, como la Vía Láctea real
  const wave = (p: number) => Math.sin(p * 3.2 + k[0]) * spread * 0.18;
  // Núcleo galáctico: más ancho y cálido hacia el 28 % del recorrido, lejos del texto central
  const bulge = (p: number) => Math.exp(-((p - 0.28) ** 2) / 0.03);
  const angle = Math.atan2(dy, dx);
  // Mancha suave estirada en la dirección de la banda (el radial solo daría círculos)
  const streak = (x: number, y: number, radius: number, stretch: number, color: string, alpha: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(stretch, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    g.addColorStop(0, `rgb(${color} / ${alpha})`);
    g.addColorStop(1, 'rgb(0 0 0 / 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  };
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
  const at = (p: number, offset: number) => ({
    x: x0 + dx * p + nx * (wave(p) + offset),
    y: y0 + dy * p + ny * (wave(p) + offset)
  });

  // 1. Resplandor difuso: cálido en el centro y el núcleo, azulado en los bordes
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 420; i++) {
    const p = Math.random();
    const b = bulge(p);
    const offset = gauss() * spread * (0.75 + b * 0.3);
    const edge = Math.min(1, Math.abs(offset) / spread);
    const { x, y } = at(p, offset);
    const radius = spread * (0.2 + Math.random() * 0.35) * (1 + b * 0.35);
    const alpha = (0.045 + b * 0.03) * patch(p) * (1 - edge * 0.6);
    const color = edge < 0.35 ? (b > 0.4 ? '255 226 192' : '232 228 222') : (Math.random() < 0.2 ? '220 170 190' : '165 185 235');
    streak(x, y, radius, 2.4, color, alpha);
  }

  // 2. Franjas de polvo oscuro que recorren la banda y la parten (la "Gran Grieta")
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 320; i++) {
    const p = Math.random();
    const lane = Math.sin(p * 9 + k[1]) * spread * 0.18 + Math.sin(p * 23 + k[2]) * spread * 0.06 + spread * 0.05;
    const { x, y } = at(p, lane + gauss() * spread * 0.18);
    const radius = spread * (0.05 + Math.random() * 0.14);
    // Tramos donde el polvo casi desaparece: la grieta se ve rota, no como una línea
    const gap = Math.max(0, Math.sin(p * 11 + k[0]) + 0.2);
    const strength = (0.1 + 0.45 * Math.random()) * Math.min(1, gap);
    if (strength < 0.05) continue;
    streak(x, y, radius, 1.8, '0 0 0', strength);
  }

  // 3. Nubes de estrellas: muchas y muy finas, más densas en el centro y el núcleo
  ctx.globalCompositeOperation = 'lighter';
  const dust = Math.round(len * 14);
  for (let i = 0; i < dust; i++) {
    const p = Math.random();
    if (Math.random() > patch(p) * 0.9 + bulge(p) * 0.2) continue;
    const offset = gauss() * spread * 0.75;
    const { x, y } = at(p, offset);
    const center = 1 - Math.min(1, Math.abs(offset) / (spread * 1.2));
    const a = 0.08 + Math.random() * 0.45 * center + bulge(p) * 0.08;
    const warm = bulge(p) > 0.3 && Math.random() < 0.5;
    ctx.fillStyle = warm ? `rgb(255 225 190 / ${a})` : `rgb(225 232 255 / ${a})`;
    const size = Math.random() < 0.97 ? 0.6 : 1.2;
    ctx.fillRect(x, y, size, size);
  }

  // 4. Algunas estrellas brillantes con halo dentro de la banda
  for (let i = 0; i < 40; i++) {
    const p = Math.random();
    const { x, y } = at(p, gauss() * spread * 0.6);
    const r = 3 + Math.random() * 4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgb(255 255 255 / 0.85)');
    g.addColorStop(0.25, 'rgb(220 230 255 / 0.25)');
    g.addColorStop(1, 'rgb(0 0 0 / 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  ctx.globalCompositeOperation = 'source-over';
  return off;
}
