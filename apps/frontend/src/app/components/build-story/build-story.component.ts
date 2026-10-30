import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ProjectsService } from '../../shared/services/projects.service';

interface StoryStep {
  node: string;
  title: string;
  text: string;
  file: string;
  code: string;
}

// Recorrido de cómo viaja un dato desde la base hasta la pantalla.
// Los fragmentos de código son extractos reales del repositorio.
@Component({
  selector: 'app-build-story',
  standalone: true,
  templateUrl: './build-story.component.html',
  styleUrl: './build-story.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BuildStoryComponent implements OnInit, OnDestroy {
  private projectsService = inject(ProjectsService);
  private platformId = inject(PLATFORM_ID);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: IntersectionObserver | null = null;

  active = signal(0);
  projectCount = signal<number | null>(null);

  steps: StoryStep[] = [
    {
      node: 'PostgreSQL',
      title: 'Los datos viven en PostgreSQL',
      text: 'Proyectos, servicios, certificados y mensajes de contacto se guardan en una base PostgreSQL alojada en Neon. Prisma define el esquema y genera las migraciones.',
      file: 'apps/api/prisma/schema.prisma',
      code: `model Projects {
  id               Int      @id @default(autoincrement())
  title            String   @db.VarChar(100)
  shortDescription String   @db.VarChar(255)
  technologies     String[] @db.VarChar(255)
  status           String   @db.VarChar(50)
  githubUrl        String?  @db.VarChar(255)
  webUrl           String?  @db.VarChar(255)
}`
    },
    {
      node: 'Express',
      title: 'Una API REST en Express los expone',
      text: 'Cada recurso tiene su propio router. Leer es público; crear, editar o borrar exige la cabecera x-api-key, que solo usa el panel de administración.',
      file: 'apps/api/src/view/project.routes.ts',
      code: `const projectRouter = Router();
projectRouter.get("/", ProjectController.getAll);
projectRouter.get("/:id", ProjectController.getOne);
projectRouter.post("/", apiMiddleware, ProjectController.create);
projectRouter.put("/:id", apiMiddleware, ProjectController.update);
projectRouter.delete("/:id", apiMiddleware, ProjectController.delete);`
    },
    {
      node: 'Angular',
      title: 'Angular los pide y los pinta',
      text: 'Los servicios de Angular consultan la API al cargar la página. Si la API no responde, se usa una copia local para que la sección no quede vacía.',
      file: 'apps/frontend/src/app/shared/services/projects.service.ts',
      code: `getProjects(): Observable<Project[]> {
  return this.http.get<Project[]>(this.apiUrl).pipe(
    catchError(() => {
      console.warn('Failed to fetch projects from backend, using local fallbacks');
      return of(this.fallbackProjects);
    })
  );
}`
    },
    {
      node: 'Vercel',
      title: 'Vercel sirve todo desde un solo dominio',
      text: 'Un único build compila la API y el frontend. Las rutas /api/* van a la función de Express y el resto al frontend, así ambos comparten origen y no hay CORS de por medio.',
      file: 'vercel.json',
      code: `"rewrites": [
  { "source": "/api/(.*)", "destination": "/api" },
  { "source": "/((?!api/).*)", "destination": "/index.html" }
]`
    }
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.projectsService.getProjects().subscribe(projects => this.projectCount.set(projects.length));
  }

  constructor() {
    // afterNextRender solo corre en el navegador y ya con los pasos hidratados en el DOM
    afterNextRender(() => this.observeSteps());
  }

  private observeSteps(): void {
    // Un paso está activo cuando cruza la línea central de la ventana
    this.observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.active.set(Number((entry.target as HTMLElement).dataset['index']));
          }
        }
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
    );
    this.host.nativeElement.querySelectorAll('.story-step').forEach(el => this.observer!.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
