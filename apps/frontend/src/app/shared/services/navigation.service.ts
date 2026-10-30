import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private isScrolledSignal = signal(false);

  isScrolled = this.isScrolledSignal.asReadonly();

  constructor() {
    this.initializeScrollListener();
  }

  private initializeScrollListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        this.updateScrollState();
      });
    }
  }

  private updateScrollState(): void {
    // Marcar como scrolled ni bien el usuario baja un poco (ej. 50px)
    const isScrolled = window.scrollY > 50;
    this.isScrolledSignal.set(isScrolled);
  }
}
