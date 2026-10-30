import { Component } from '@angular/core';
import { HeroComponent } from '../../components/hero/hero.component';
import { CorporateAboutComponent } from '../../components/corporate-about/corporate-about.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { FeaturedServicesComponent } from '../../components/featured-services/featured-services.component';
import { FeaturedProjectsComponent } from '../../components/featured-projects/featured-projects.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent,
    CorporateAboutComponent,
    FeaturedServicesComponent,
    FeaturedProjectsComponent,
    FooterComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.sass',
})
export class Home {

}
