import { Component, OnInit, ChangeDetectionStrategy, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../button/button.component';
import { GithubActivity, GithubActivityService, GITHUB_USER } from '../../shared/services/github-activity.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterModule, ButtonComponent],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroComponent implements OnInit {
  private router = inject(Router);
  private github = inject(GithubActivityService);
  private platformId = inject(PLATFORM_ID);

  readonly githubUser = GITHUB_USER;
  activity = signal<GithubActivity | null>(null);
  failed = signal(false);

  ngOnInit(): void {
    // La API de GitHub solo se consulta en el navegador, no durante el prerender
    if (!isPlatformBrowser(this.platformId)) return;
    this.github.getActivity().subscribe(data => {
      this.activity.set(data);
      this.failed.set(data === null);
    });
  }

  timeAgo(date: Date): string {
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (hours < 24) return rtf.format(-hours, 'hour');
    const days = Math.round(hours / 24);
    if (days < 30) return rtf.format(-days, 'day');
    return rtf.format(-Math.round(days / 30), 'month');
  }

  scrollToContact(): void {
    this.router.navigate(['/contacto'], { fragment: 'formulario-contacto' });
  }
}
