import { ChangeDetectionStrategy, Component } from '@angular/core';

let nextId = 0;

// Logo: la K de kiramman. El brazo de arriba es una estrella fugaz que sale del tronco,
// la misma que cruza la intro. Toma los colores del tema, así sirve en claro y oscuro.
@Component({
  selector: 'app-logo-mark',
  standalone: true,
  template: `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient [attr.id]="trailId" x1="24" y1="32" x2="48" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0" style="stop-color: var(--primary); stop-opacity: 0.45" />
          <stop offset="1" style="stop-color: var(--primary); stop-opacity: 1" />
        </linearGradient>
      </defs>
      <path class="stroke" d="M20 10 V54 M25 35 L46 54" />
      <path [attr.fill]="'url(#' + trailId + ')'" d="M23 30.9 L25 33.1 L50.9 15.5 L45.1 8.5 Z" />
      <circle class="glow" cx="48" cy="12" r="8" />
      <circle class="head" cx="48" cy="12" r="4.4" />
    </svg>
  `,
  styles: `
:host
  display: inline-block
  line-height: 0

svg
  width: 100%
  height: 100%
  overflow: visible

.stroke
  fill: none
  stroke: currentColor
  stroke-width: 7
  stroke-linecap: round

.glow
  fill: var(--primary)
  opacity: 0.3

.head
  fill: var(--purple-bright)
`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogoMarkComponent {
  // Header y footer comparten la página: cada degradado necesita su propio id
  protected readonly trailId = `logo-trail-${nextId++}`;
}
