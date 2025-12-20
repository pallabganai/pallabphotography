import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent implements OnInit {
  
  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setMetaTags({
      title: 'About - Pallab\'s Photography',
      description: 'Learn more about Pallab and the passion behind the photography. Discover the story and inspiration.',
      url: 'https://pallabsphotography.com/about'
    });
  }
}


