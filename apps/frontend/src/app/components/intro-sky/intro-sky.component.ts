import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  signal,
  viewChild
} from '@angular/core';

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  appear: number;
  twinkle: number;
  phase: number;
}

// Línea de tiempo de la intro, en milisegundos desde que arranca
const T = {
  starsIn: 1600,
  galaxyFrom: 700,
  galaxyTo: 2400,
  hello: 1100,
  meteorStart: 2300,
  meteorDuration: 1150,
  subtitle: 3500,
  leave: 4600,
  fade: 700
};

const smoothstep = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

// Intro de entrada: cielo negro, aparecen estrellas y una galaxia, y una estrella fugaz
// cruza la pantalla iluminando el texto a su paso. Se muestra en cada carga de la página.
@Component({
  selector: 'app-intro-sky',
  standalone: true,
  templateUrl: './intro-sky.component.html',
  styleUrl: './intro-sky.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntroSkyComponent implements OnDestroy {
  private canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('sky');
  private titleRef = viewChild<ElementRef<HTMLElement>>('title');

  done = signal(false);
  leaving = signal(false);
  showHello = signal(false);
  showSubtitle = signal(false);

  private raf = 0;
  private finished = false;
  private onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') this.skip(); };
  private onResize = () => this.setup();

  private stars: Star[] = [];
  private galaxy: HTMLCanvasElement | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private startTime = 0;

  constructor() {
    afterNextRender(() => this.start());
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  skip(): void {
    this.finish();
  }

  private start(): void {
    const root = document.documentElement;
    // El script de index.html marca skip-intro si el sistema pide menos movimiento
    if (root.classList.contains('skip-intro') || !this.canvasRef()) {
      root.classList.remove('intro-active');
      this.done.set(true);
      return;
    }
    root.classList.add('intro-active');
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.onResize);
    this.setup();
    this.startTime = performance.now();
    this.raf = requestAnimationFrame(now => this.frame(now));
  }

  private setup(): void {
    const canvas = this.canvasRef()!.nativeElement;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    canvas.width = Math.round(this.width * this.dpr);
    canvas.height = Math.round(this.height * this.dpr);

    const count = Math.round((this.width * this.height) / 2600);
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      r: Math.random() < 0.9 ? 0.3 + Math.random() * 0.8 : 1 + Math.random() * 0.8,
      alpha: 0.35 + Math.random() * 0.65,
      appear: Math.random() * T.starsIn,
      twinkle: 0.15 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2
    }));
    this.galaxy = this.paintGalaxy();
  }

  // La galaxia es estática: se pinta una vez en un canvas aparte y luego solo cambia su opacidad
  private paintGalaxy(): HTMLCanvasElement {
    const off = document.createElement('canvas');
    off.width = Math.round(this.width * this.dpr);
    off.height = Math.round(this.height * this.dpr);
    const ctx = off.getContext('2d')!;
    ctx.scale(this.dpr, this.dpr);

    // Banda diagonal, de abajo a la izquierda hacia arriba a la derecha
    const x0 = this.width * -0.1, y0 = this.height * 1.0;
    const x1 = this.width * 1.1, y1 = this.height * 0.0;
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    const spread = Math.min(this.width, this.height) * 0.2;

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

  private frame(now: number): void {
    if (this.finished) return;
    const t = now - this.startTime;
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    // Si Angular recrea el canvas (hidratación o recarga en caliente) vuelve a su tamaño por defecto
    const targetWidth = Math.round(this.width * this.dpr);
    if (canvas.width !== targetWidth) {
      canvas.width = targetWidth;
      canvas.height = Math.round(this.height * this.dpr);
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    // Galaxia
    const g = smoothstep(T.galaxyFrom, T.galaxyTo, t);
    if (this.galaxy && g > 0) {
      ctx.globalAlpha = g;
      ctx.drawImage(this.galaxy, 0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }

    // Estrellas: cada una se enciende en su momento y titila
    for (const s of this.stars) {
      const on = smoothstep(s.appear, s.appear + 500, t);
      if (on === 0) continue;
      const a = on * s.alpha * (1 - s.twinkle + s.twinkle * Math.sin(t * 0.003 + s.phase));
      ctx.fillStyle = `rgb(240 244 255 / ${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawMeteor(ctx, t);

    if (t >= T.hello && !this.showHello()) this.showHello.set(true);
    if (t >= T.subtitle && !this.showSubtitle()) this.showSubtitle.set(true);
    if (t >= T.leave) {
      this.finish();
      return;
    }
    this.raf = requestAnimationFrame(n => this.frame(n));
  }

  private drawMeteor(ctx: CanvasRenderingContext2D, t: number): void {
    const title = this.titleRef()?.nativeElement;
    const p = (t - T.meteorStart) / T.meteorDuration;
    if (p < 0) return;

    // Cruza de derecha a izquierda, pasando justo por encima del texto
    const cy = this.height / 2;
    const sx = this.width + 120, sy = cy - this.height * 0.22;
    const ex = -160, ey = cy + this.height * 0.08;
    const e = Math.min(p, 1.2);
    const hx = sx + (ex - sx) * e;
    const hy = sy + (ey - sy) * e;

    // Luz que deja la estrella sobre el texto: la parte ya recorrida queda encendida
    if (title) {
      const rect = title.getBoundingClientRect();
      title.style.setProperty('--lx', `${hx - rect.left}px`);
      title.style.setProperty('--ly', `${hy - rect.top}px`);
    }

    if (p > 1.15) return;
    const fade = Math.sin(Math.min(1, Math.max(0, p)) * Math.PI);

    // Halo que ilumina el fondo alrededor de la cabeza
    const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 260);
    glow.addColorStop(0, `rgb(200 235 215 / ${0.28 * fade})`);
    glow.addColorStop(1, 'rgb(0 0 0 / 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(hx - 260, hy - 260, 520, 520);

    // Estela
    const angle = Math.atan2(ey - sy, ex - sx);
    const tail = 280;
    const tx = hx - Math.cos(angle) * tail;
    const ty = hy - Math.sin(angle) * tail;
    const trail = ctx.createLinearGradient(hx, hy, tx, ty);
    trail.addColorStop(0, `rgb(255 255 255 / ${0.95 * fade})`);
    trail.addColorStop(0.25, `rgb(200 235 215 / ${0.5 * fade})`);
    trail.addColorStop(1, 'rgb(200 235 215 / 0)');
    ctx.strokeStyle = trail;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.fillStyle = `rgb(255 255 255 / ${fade})`;
    ctx.beginPath();
    ctx.arc(hx, hy, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.cleanup();
    // El texto queda encendido por completo antes de desvanecerse
    this.titleRef()?.nativeElement.style.setProperty('--lx', '-400px');
    this.leaving.set(true);
    document.documentElement.classList.remove('intro-active');
    setTimeout(() => this.done.set(true), T.fade);
  }

  private cleanup(): void {
    cancelAnimationFrame(this.raf);
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKey);
      window.removeEventListener('resize', this.onResize);
    }
  }
}
