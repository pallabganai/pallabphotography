import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface MetaTags {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  keywords?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private defaultTitle = 'Pallab\'s Photography';
  private defaultDescription = 'Explore stunning photography by Pallab. A curated gallery of photographs capturing beautiful moments and landscapes.';
  private defaultImage = 'https://pallabsphotography.com/assets/og-image.jpg';
  private baseUrl = 'https://pallabsphotography.com';

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private router: Router
  ) {
    this.setupRouteListener();
  }

  private setupRouteListener(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = this.baseUrl + event.urlAfterRedirects;
      this.updateCanonicalUrl(url);
    });
  }

  setMetaTags(tags: MetaTags): void {
    const title = tags.title || this.defaultTitle;
    const description = tags.description || this.defaultDescription;
    const image = tags.image || this.defaultImage;
    const url = tags.url || this.baseUrl;

    // Set title
    this.titleService.setTitle(title);

    // Set meta tags
    this.metaService.updateTag({ name: 'description', content: description });
    
    if (tags.keywords) {
      this.metaService.updateTag({ name: 'keywords', content: tags.keywords });
    }

    // Open Graph tags
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ property: 'og:url', content: url });

    // Twitter tags
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: image });
    this.metaService.updateTag({ name: 'twitter:url', content: url });
  }

  private updateCanonicalUrl(url: string): void {
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    
    link.setAttribute('href', url);
  }

  generateStructuredData(type: string, data: any): void {
    let script: HTMLScriptElement | null = document.querySelector('#structured-data');
    
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('id', 'structured-data');
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': type,
      ...data
    };

    script.textContent = JSON.stringify(structuredData);
  }
}


