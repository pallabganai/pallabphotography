import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, of, tap, shareReplay } from 'rxjs';
import { Photo, PhotosData } from '../models/photo.model';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  private photosSubject = new BehaviorSubject<Photo[]>([]);
  public photos$ = this.photosSubject.asObservable();
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  
  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();
  
  // Cache for tags to avoid recalculating
  private tagsCache: string[] | null = null;
  
  // Photo JSON URL - supports both local development and production
  private readonly PHOTOS_JSON_URL = this.getPhotosJsonUrl();
  
  private getPhotosJsonUrl(): string {
    // Prefer local file during local dev to avoid CORS/network issues.
    const hostname = window.location.hostname;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1';

    if (isLocal) {
      return '/assets/photos.json';
    }

    const cloudFrontUrl = (window as any).PHOTO_GALLERY_CDN_URL;
    if (cloudFrontUrl) {
      const baseUrl = cloudFrontUrl.replace(/\/$/, '');
      return `${baseUrl}/assets/photos.json`;
    }

    // Fallback to relative path
    return '/assets/photos.json';
  }

  constructor(private http: HttpClient) {
    // Subscribe to photos changes to invalidate tags cache
    this.photos$.subscribe(() => {
      this.tagsCache = null;
    });
  }

  loadPhotos(): void {
    // Don't reload if already loading
    if (this.loadingSubject.value) {
      console.log('PhotoService: Already loading, skipping...');
      return;
    }
    
    // If photos are already loaded, emit them immediately (no need to reload)
    if (this.photosSubject.value.length > 0) {
      console.log('PhotoService: Photos already loaded, skipping...', this.photosSubject.value.length);
      return;
    }
    
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    
    this.http.get<PhotosData>(this.PHOTOS_JSON_URL).pipe(
      tap((data) => {
        const photos = data?.photos || [];
        const sortedPhotos = this.sortPhotos(photos);
        this.photosSubject.next(sortedPhotos);
        this.loadingSubject.next(false);
        this.errorSubject.next(null);
      }),
      catchError((error) => {
        console.error('Error loading photos:', error);
        console.error('URL attempted:', this.PHOTOS_JSON_URL);
        
        let errorMessage = 'Failed to load photos. ';
        if (error?.status === 404) {
          errorMessage += 'Photos file not found. Please ensure photos.json exists.';
        } else if (error?.status === 0) {
          errorMessage += 'Network error. Please check your connection.';
        } else {
          errorMessage += 'Please check the browser console for details.';
        }
        
        this.errorSubject.next(errorMessage);
        this.loadingSubject.next(false);
        this.photosSubject.next([]);
        return of({ photos: [], lastUpdated: '' });
      })
    ).subscribe();
  }
  
  reloadPhotos(): void {
    this.photosSubject.next([]);
    this.tagsCache = null;
    this.loadPhotos();
  }

  getPhotos(): Photo[] {
    return this.photosSubject.value;
  }

  getPhotoById(id: string): Photo | undefined {
    return this.photosSubject.value.find(photo => photo.id === id);
  }

  /**
   * Sort photos by leading numeric prefix if present (e.g., "01-beach.jpg"),
   * otherwise fallback to title/id alphabetical order. Keeps user-defined
   * sequence numbers without exposing them as tags.
   */
  private sortPhotos(photos: Photo[]): Photo[] {
    const numericPrefix = (text: string | undefined): number | null => {
      if (!text) return null;
      const match = text.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    };

    return [...photos].sort((a, b) => {
      const aNum = numericPrefix(a.id || a.title);
      const bNum = numericPrefix(b.id || b.title);

      if (aNum !== null && bNum !== null && aNum !== bNum) {
        return aNum - bNum;
      }

      const aKey = (a.title || a.id || '').toLowerCase();
      const bKey = (b.title || b.id || '').toLowerCase();
      return aKey.localeCompare(bKey);
    });
  }

  getAllTags(): string[] {
    // Use cache if available
    if (this.tagsCache) {
      return this.tagsCache;
    }
    
    const photos = this.photosSubject.value;
    
    // Count occurrences of each tag
    const tagCounts = new Map<string, number>();
    photos.forEach(photo => {
      if (photo.tags && photo.tags.length > 0) {
        photo.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });
    
    // Sort tags by count (descending), then alphabetically for ties
    const sortedTags = Array.from(tagCounts.entries())
      .sort((a, b) => {
        // First sort by count (descending)
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        // If counts are equal, sort alphabetically
        return a[0].localeCompare(b[0]);
      })
      .map(entry => entry[0]); // Extract just the tag names
    
    this.tagsCache = sortedTags;
    return this.tagsCache;
  }

  filterPhotosByTags(tags: string[]): Photo[] {
    if (tags.length === 0) {
      return this.photosSubject.value;
    }
    
    // Use Set for O(1) lookup performance
    const tagSet = new Set(tags);
    
    return this.photosSubject.value.filter(photo => 
      photo.tags?.some(tag => tagSet.has(tag))
    );
  }

  /**
   * Dynamically generate categories based on available tags
   * Groups tags into meaningful categories
   */
  getDynamicCategories(): { name: string; displayName: string; tags: string[] }[] {
    const allTags = this.getAllTags().filter(tag => {
      const lowerTag = tag.toLowerCase();
      return lowerTag !== 'photo' && lowerTag !== 'video';
    });

    if (allTags.length === 0) {
      return [];
    }

    const categories: { name: string; displayName: string; tags: string[] }[] = [];
    const usedTags = new Set<string>();

    // Define tag patterns for each category
    const categoryPatterns: { name: string; displayName: string; patterns: string[] }[] = [
      {
        name: 'nature',
        displayName: 'Nature',
        patterns: ['nature', 'forest', 'tree', 'waterfall', 'meadow', 'river', 'mountain', 'valley', 'hills', 'himalaya', 'mountains', 'ridges', 'panorama']
      },
      {
        name: 'landscape',
        displayName: 'Landscape',
        patterns: ['landscape', 'mountain', 'valley', 'hills', 'himalaya', 'mountains', 'panorama', 'wide', 'layers', 'ridges', 'sunset', 'dusk', 'horizon']
      },
      {
        name: 'water',
        displayName: 'Water',
        patterns: ['water', 'lake', 'waterfall', 'river', 'reflection', 'harbor', 'pier', 'dock', 'riverbend']
      },
      {
        name: 'urban',
        displayName: 'Urban',
        patterns: ['city', 'cityscape', 'building', 'sydney', 'harbor', 'operahouse', 'vivid', 'lightshow', 'skyline', 'urban']
      },
      {
        name: 'night',
        displayName: 'Night Photography',
        patterns: ['night', 'astrophotography', 'milkyway', 'stars', 'dusk', 'sunset', 'light', 'lightshow', 'vivid', 'longexposure', 'lighttrails']
      },
      {
        name: 'portraits',
        displayName: 'Portraits',
        patterns: ['portrait', 'portraits', 'people', 'person', 'face']
      },
      {
        name: 'travel',
        displayName: 'Travel',
        patterns: ['australia', 'india', 'uttarakhand', 'sydney', 'kedarnath', 'mana', 'auli', 'namdadevi']
      },
      {
        name: 'seasons',
        displayName: 'Seasons',
        patterns: ['autumn', 'fall', 'color', 'foliage', 'snow', 'snowpeaks', 'winter', 'spring', 'summer']
      }
    ];

    // Build categories based on patterns
    categoryPatterns.forEach(category => {
      const matchingTags: string[] = [];
      
      category.patterns.forEach(pattern => {
        // Find tags that match this pattern
        allTags.forEach(tag => {
          const lowerTag = tag.toLowerCase();
          const lowerPattern = pattern.toLowerCase();
          
          if (!usedTags.has(tag) && 
              (lowerTag === lowerPattern || 
               lowerTag.includes(lowerPattern) || 
               lowerPattern.includes(lowerTag))) {
            matchingTags.push(tag);
            usedTags.add(tag);
          }
        });
      });

      // Only add category if it has matching tags
      if (matchingTags.length > 0) {
        categories.push({
          name: category.name,
          displayName: category.displayName,
          tags: matchingTags
        });
      }
    });

    // Add remaining popular tags as individual categories (if they have enough photos)
    const remainingTags = allTags.filter(tag => !usedTags.has(tag));
    
    // Count photo occurrences for remaining tags
    const tagCounts = new Map<string, number>();
    remainingTags.forEach(tag => {
      const count = this.photosSubject.value.filter(photo => 
        photo.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
      ).length;
      tagCounts.set(tag, count);
    });

    // Add popular remaining tags (with at least 2 photos) as categories
    Array.from(tagCounts.entries())
      .filter(([_, count]) => count >= 2)
      .sort(([_, a], [__, b]) => b - a) // Sort by count descending
      .slice(0, 3) // Limit to top 3
      .forEach(([tag, _]) => {
        categories.push({
          name: tag.toLowerCase().replace(/\s+/g, '-'),
          displayName: tag.charAt(0).toUpperCase() + tag.slice(1),
          tags: [tag]
        });
      });

    return categories;
  }
}


