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
// cruza la pantalla iluminando el texto a su paso. Se muestra una vez por sesión.
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
    // El script de index.html marca skip-intro si ya se vio en esta sesión o si se pide menos movimiento
    if (root.classList.contains('skip-intro') || !this.canvasRef()) {
      root.classList.remove('intro-active');
      this.done.set(true);
      return;
    }
    try { sessionStorage.setItem('intro-seen', '1'); } catch { }

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
    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;

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
    off.width = this.width * this.dpr;
    off.height = this.height * this.dpr;
    const ctx = off.getContext('2d')!;
    ctx.scale(this.dpr, this.dpr);

    // Banda diagonal, de abajo a la izquierda hacia arriba a la derecha
    const x0 = this.width * -0.05, y0 = this.height * 0.95;
    const x1 = this.width * 1.05, y1 = this.height * 0.05;
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    const spread = Math.min(this.width, this.height) * 0.16;

    ctx.globalCompositeOperation = 'lighter';
    const tints = ['63 125 92', '90 120 170', '150 110 160'];
    for (let i = 0; i < 9; i++) {
      const p = (i + 0.5) / 9;
      const cx = x0 + dx * p + nx * (Math.random() - 0.5) * spread * 0.6;
      const cy = y0 + dy * p + ny * (Math.random() - 0.5) * spread * 0.6;
      const radius = spread * (1.2 + Math.random() * 1.2);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      g.addColorStop(0, `rgb(${tints[i % tints.length]} / 0.16)`);
      g.addColorStop(1, 'rgb(0 0 0 / 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    // Polvo de estrellas concentrado en el centro de la banda (aproximación gaussiana)
    const dust = Math.round(len * 3);
    for (let i = 0; i < dust; i++) {
      const p = Math.random();
      const offset = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
      const x = x0 + dx * p + nx * offset;
      const y = y0 + dy * p + ny * offset;
      const a = 0.15 + Math.random() * 0.5 * (1 - Math.abs(offset) / (spread * 1.5));
      ctx.fillStyle = `rgb(235 240 255 / ${Math.max(0.05, a)})`;
      ctx.fillRect(x, y, Math.random() < 0.95 ? 0.7 : 1.3, Math.random() < 0.95 ? 0.7 : 1.3);
    }
    return off;
  }

  private frame(now: number): void {
    if (this.finished) return;
    const t = now - this.startTime;
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
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
