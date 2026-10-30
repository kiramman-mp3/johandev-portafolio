import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export const GITHUB_USER = 'kiramman-mp3';

export interface GithubActivity {
  publicRepos: number;
  lastPush: {
    repo: string;
    message: string;
    sha: string;
    date: Date;
  } | null;
}

interface GithubEvent {
  type: string;
  repo: { name: string };
  created_at: string;
  payload: { head?: string; commits?: { sha: string; message: string }[] };
}

function firstLine(text: string): string {
  return text.split('\n')[0];
}

// Lee datos públicos de la API de GitHub (sin token: 60 peticiones por hora e IP).
// Si la API falla devuelve null y el hero muestra solo el enlace al perfil.
@Injectable({
  providedIn: 'root'
})
export class GithubActivityService {
  private apiUrl = 'https://api.github.com';

  constructor(private http: HttpClient) { }

  getActivity(): Observable<GithubActivity | null> {
    const user$ = this.http.get<{ public_repos: number }>(`${this.apiUrl}/users/${GITHUB_USER}`);
    const events$ = this.http.get<GithubEvent[]>(`${this.apiUrl}/users/${GITHUB_USER}/events/public?per_page=30`);

    return forkJoin([user$, events$]).pipe(
      switchMap(([user, events]) => {
        const push = events.find(e => e.type === 'PushEvent');
        if (!push) return of<GithubActivity>({ publicRepos: user.public_repos, lastPush: null });

        const base = { repo: push.repo.name, date: new Date(push.created_at) };
        const commit = push.payload.commits?.at(-1);
        if (commit) {
          return of<GithubActivity>({
            publicRepos: user.public_repos,
            lastPush: { ...base, sha: commit.sha.slice(0, 7), message: firstLine(commit.message) }
          });
        }

        // El evento ya no siempre trae la lista de commits: se pide el commit de head
        const head = push.payload.head ?? '';
        return this.http.get<{ commit: { message: string } }>(`${this.apiUrl}/repos/${push.repo.name}/commits/${head}`).pipe(
          map(res => res.commit.message),
          catchError(() => of('')),
          map(message => ({
            publicRepos: user.public_repos,
            lastPush: { ...base, sha: head.slice(0, 7), message: firstLine(message) }
          }))
        );
      }),
      catchError(() => of(null))
    );
  }
}
