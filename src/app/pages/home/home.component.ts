import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  
  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setMetaTags({
      title: 'Pallab\'s Photography - Home',
      description: 'Welcome to Pallab\'s Photography. Explore stunning photographs capturing beautiful moments and landscapes.',
      url: 'https://pallabsphotography.com/'
    });

    this.seoService.generateStructuredData('Person', {
      name: 'Pallab',
      url: 'https://pallabsphotography.com',
      jobTitle: 'Photography Enthusiast',
      description: 'Photography enthusiast passionate about capturing beautiful moments'
    });
  }
}


