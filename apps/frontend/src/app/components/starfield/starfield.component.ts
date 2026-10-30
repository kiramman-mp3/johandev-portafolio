import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, inject, viewChild } from '@angular/core';
import { createStars, drawShootingStar, paintMilkyWay } from '../../shared/sky/sky-painter';

// Pausa entre estrellas fugaces, en milisegundos
const METEOR_GAP = { min: 2500, max: 6000 };
const METEOR_DURATION = 900;

// Cielo de fondo de todo el sitio: la misma Vía Láctea de la intro, más tenue y fija.
// El cielo se pinta una sola vez; solo se anima mientras cruza una estrella fugaz.
@Component({
  selector: 'app-starfield',
  standalone: true,
  template: '<canvas #sky aria-hidden="true"></canvas>',
  styleUrl: './starfield.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StarfieldComponent implements OnDestroy {
  private canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('sky');
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: MutationObserver | undefined;

  private sky: HTMLCanvasElement | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private raf = 0;
  private meteorTimer: ReturnType<typeof setTimeout> | undefined;
  private resizeTimer: ReturnType<typeof setTimeout> | undefined;
  private reduceMotion = false;

  private onResize = () => {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      // En móvil la barra del navegador cambia el alto al hacer scroll: solo se repinta si el cambio es grande
      if (window.innerWidth !== this.width || Math.abs(window.innerHeight - this.height) > 140) this.paint();
    }, 200);
  };

  constructor() {
    afterNextRender(() => {
      this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      this.paint();
      // Angular puede recrear el canvas después de hidratar; el nuevo sale vacío y con tamaño por defecto
      this.observer = new MutationObserver(() => this.drawSky());
      this.observer.observe(this.host.nativeElement, { childList: true });
      window.addEventListener('resize', this.onResize);
      if (!this.reduceMotion) this.scheduleMeteor();
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.raf) cancelAnimationFrame(this.raf);
    clearTimeout(this.meteorTimer);
    clearTimeout(this.resizeTimer);
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.onResize);
  }

  private paint(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    canvas.width = Math.round(this.width * this.dpr);
    canvas.height = Math.round(this.height * this.dpr);

    // Se compone todo en un canvas aparte para poder redibujarlo de golpe bajo la estrella fugaz
    const sky = document.createElement('canvas');
    sky.width = canvas.width;
    sky.height = canvas.height;
    const ctx = sky.getContext('2d')!;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(paintMilkyWay(this.width, this.height, this.dpr), 0, 0);
    ctx.globalAlpha = 1;
    ctx.scale(this.dpr, this.dpr);
    for (const s of createStars(this.width, this.height, 3200)) {
      ctx.fillStyle = `rgb(240 244 255 / ${s.alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    this.sky = sky;
    this.drawSky();
  }

  private drawSky(): CanvasRenderingContext2D | null {
    const canvas = this.host.nativeElement.querySelector('canvas');
    if (!canvas || !this.sky) return null;
    if (canvas.width !== this.sky.width || canvas.height !== this.sky.height) {
      canvas.width = this.sky.width;
      canvas.height = this.sky.height;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.sky, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    return ctx;
  }

  private scheduleMeteor(): void {
    const wait = METEOR_GAP.min + Math.random() * (METEOR_GAP.max - METEOR_GAP.min);
    this.meteorTimer = setTimeout(() => this.launchMeteor(), wait);
  }

  private launchMeteor(): void {
    const root = document.documentElement;
    // Sin estrellas fugaces durante la intro, en tema claro o con la pestaña oculta
    if (document.hidden || root.classList.contains('intro-active') || root.classList.contains('light-theme')) {
      this.scheduleMeteor();
      return;
    }
    const fromLeft = Math.random() < 0.5;
    const y = this.height * (0.05 + Math.random() * 0.4);
    const from = { x: fromLeft ? -40 : this.width + 40, y };
    const to = { x: fromLeft ? this.width * 0.6 : this.width * 0.4, y: y + this.height * (0.2 + Math.random() * 0.2) };
    const start = performance.now();

    const step = (now: number) => {
      const p = (now - start) / METEOR_DURATION;
      const ctx = this.drawSky();
      if (!ctx || p >= 1) {
        this.scheduleMeteor();
        return;
      }
      drawShootingStar(ctx, from, to, p);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
}
