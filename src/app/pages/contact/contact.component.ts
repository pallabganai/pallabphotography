import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactComponent implements OnInit {
  constructor(
    private seoService: SeoService
  ) {}

  ngOnInit(): void {
    this.seoService.setMetaTags({
      title: 'Contact - Pallab\'s Photography',
      description: 'Get in touch with Pallab. Connect with a fellow photography enthusiast or just to say hello.',
      url: 'https://pallabsphotography.com/contact'
    });
  }
}


