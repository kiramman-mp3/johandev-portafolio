import { Component } from '@angular/core';

interface AboutFact {
  label: string;
  value: string;
}

@Component({
  selector: 'app-corporate-about',
  standalone: true,
  templateUrl: './corporate-about.component.html',
  styleUrl: './corporate-about.component.scss',
})
export class CorporateAboutComponent {
  facts: AboutFact[] = [
    { label: 'Ubicación', value: 'Quero, Tungurahua, Ecuador' },
    { label: 'Estudios', value: 'Universidad Técnica de Ambato' },
    { label: 'Frontend', value: 'Angular, TypeScript, Sass' },
    { label: 'Backend', value: 'Node.js, Express, Prisma' },
    { label: 'Datos', value: 'PostgreSQL' },
  ];
}
