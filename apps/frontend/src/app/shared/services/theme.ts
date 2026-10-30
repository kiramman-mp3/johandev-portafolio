import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkMode = signal<boolean>(true);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.initTheme();

    effect(() => {
      const isDark = this.isDarkMode();
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');

        document.documentElement.classList.toggle('light-theme', !isDark);
      }
    });
  }

  private initTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Oscuro por defecto; solo cambia si el visitante eligió claro antes
      this.isDarkMode.set(localStorage.getItem('theme') !== 'light');
    }
  }

  toggleTheme(): void {
    this.isDarkMode.update(dark => !dark);
  }
}
