import { Component, ElementRef, ViewChild, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { NavigationService } from '../../shared/services/navigation.service';
import { ScrollService, scrollBehavior } from '../../shared/services/scroll.service';
import { LogoMarkComponent } from '../logo-mark/logo-mark.component';
import { signal } from '@angular/core';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, RouterModule, LogoMarkComponent],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnDestroy {
    @ViewChild('navbar', { static: false }) navbar!: ElementRef;
    isMenuOpen = signal(false);
    // Ruta actual sin query ni fragmento, para marcar la sección activa en la píldora
    currentPath = signal('/');
    private navEndSub?: Subscription;
    private routeSub: Subscription;

    constructor(
        public navigationService: NavigationService,
        private scrollService: ScrollService,
        private router: Router,
        private elementRef: ElementRef
    ) {
        this.routeSub = this.router.events
            .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
            .subscribe(e => this.currentPath.set(e.urlAfterRedirects.split(/[?#]/)[0]));
    }

    ngOnDestroy(): void {
        this.navEndSub?.unsubscribe();
        this.routeSub.unsubscribe();
    }

    isActive(path: string): boolean {
        const current = this.currentPath();
        return path === '/' ? current === '/' : current.startsWith(path);
    }

    toggleMenu(): void {
        this.isMenuOpen.update(value => !value);
    }

    scrollToSection(sectionId: string): void {
        this.isMenuOpen.set(false);

        const doScroll = () => {
            setTimeout(() => this.scrollService.scrollToSection(sectionId), 100);
        };

        const baseUrl = this.router.url.split('?')[0].split('#')[0];
        const isOnHome = baseUrl === '/' || baseUrl === '';

        if (isOnHome) {
            doScroll();
        } else {
            this.navEndSub?.unsubscribe();
            this.navEndSub = this.router.events
                .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
                .subscribe(() => {
                    this.navEndSub?.unsubscribe();
                    this.scrollService.scrollToSectionWhenReady(sectionId);
                });
            this.router.navigate(['/']);
        }
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
        this.isMenuOpen.set(false);
    }

    navigateToProjects(): void {
        if (this.router.url === '/proyectos') {
            // Si ya estamos en proyectos, hacer scroll al inicio
            window.scrollTo({ top: 0, behavior: scrollBehavior() });
        } else {
            // Navegar a la página de proyectos
            this.router.navigate(['/proyectos']);
        }
        this.isMenuOpen.set(false);
    }

    navigateToServices(): void {
        if (this.router.url === '/servicios') {
            window.scrollTo({ top: 0, behavior: scrollBehavior() });
        } else {
            this.router.navigate(['/servicios']);
        }
        this.isMenuOpen.set(false);
    }

    navigateToCertificates(): void {
        if (this.router.url === '/certificados') {
            window.scrollTo({ top: 0, behavior: scrollBehavior() });
        } else {
            this.router.navigate(['/certificados']);
        }
        this.isMenuOpen.set(false);
    }

    navigateToContact(): void {
        if (this.router.url === '/contacto') {
            window.scrollTo({ top: 0, behavior: scrollBehavior() });
        } else {
            this.router.navigate(['/contacto']);
        }
        this.isMenuOpen.set(false);
    }

    navigateToHome(): void {
        this.scrollToSection('inicio');
    }

    closeMenu(): void {
        this.isMenuOpen.set(false);
    }

    getNavbarClasses(): Record<string, boolean> {
        return {
            'scrolled': this.navigationService.isScrolled(),
            'open': this.isMenuOpen()
        };
    }
}
