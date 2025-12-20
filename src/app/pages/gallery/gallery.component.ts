import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PhotoService } from '../../services/photo.service';
import { SeoService } from '../../services/seo.service';
import { Photo } from '../../models/photo.model';
import { Subject, takeUntil, combineLatest } from 'rxjs';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GalleryComponent implements OnInit, OnDestroy, AfterViewInit {
  photos: Photo[] = [];
  filteredPhotos: Photo[] = [];
  allTags: string[] = [];
  displayedTags: string[] = [];
  selectedTags: Set<string> = new Set();
  isLoading = false;
  error: string | null = null;
  showAllTags = false;
  readonly MAX_TAGS_DISPLAYED = 12;
  
  // Dynamic category mapping - will be populated from PhotoService
  private categoryTagMap: { [key: string]: string[] } = {};
  
  // Lightbox
  lightboxOpen = false;
  currentPhotoIndex = 0;
  currentPhoto: Photo | null = null;
  lightboxImageLoading = false; // Track loading state for lightbox image
  
  // Track loading state for each image
  loadingImages = new Set<string>();
  
  // Touch/swipe gesture tracking
  private touchStartX = 0;
  private touchStartY = 0;
  private readonly SWIPE_THRESHOLD = 50; // Minimum distance for a swipe
  private swipeJustHandled = false; // Flag to prevent tap after swipe
  
  @ViewChildren('imgElement') imageElements!: QueryList<ElementRef<HTMLImageElement>>;
  
  private destroy$ = new Subject<void>();

  constructor(
    private photoService: PhotoService,
    private seoService: SeoService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.seoService.setMetaTags({
      title: 'Pallab\'s Photography - Photography Gallery',
      description: 'Explore stunning photography by Pallab. A curated gallery of photographs capturing beautiful moments and landscapes.',
      url: 'https://pallabsphotography.com'
    });

    // Set up subscriptions first
    this.setupSubscriptions();
    
    // Always ensure photos are loaded (will skip if already loading/loaded)
    this.photoService.loadPhotos();
    
    // If photos are already loaded, trigger processing immediately
    const currentPhotos = this.photoService.getPhotos();
    if (currentPhotos.length > 0) {
      // Photos already loaded, ensure category map is populated
      const categories = this.photoService.getDynamicCategories();
      this.categoryTagMap = {};
      categories.forEach(category => {
        // Store with lowercase key for consistent lookup
        this.categoryTagMap[category.name.toLowerCase()] = category.tags;
      });
      
      // Update photos and tags
      this.photos = currentPhotos;
      this.allTags = this.photoService.getAllTags().filter(tag => {
        const lowerTag = tag.toLowerCase();
        return lowerTag !== 'photo' && lowerTag !== 'video';
      });
      this.updateDisplayedTags();
      
      // Process query params if present
      const tag = this.route.snapshot.queryParams['tag'];
      if (tag) {
        this.processTagFromUrl(tag, currentPhotos);
      }
      
      // Filter photos and trigger change detection
      this.filterPhotos();
      this.cdr.markForCheck();
    }
  }
  
  /**
   * Process tag from URL query parameter
   */
  private processTagFromUrl(tag: string, photos: Photo[]): void {
    if (!tag || !photos || photos.length === 0) {
      return;
    }
    
    const lowerTag = tag.toLowerCase().trim();
    
    // Ensure category map is populated
    if (Object.keys(this.categoryTagMap).length === 0) {
      const categories = this.photoService.getDynamicCategories();
      categories.forEach(category => {
        // Store with lowercase key for consistent lookup
        this.categoryTagMap[category.name.toLowerCase()] = category.tags;
      });
    }
    
    // Check if it's a category (maps to multiple tags)
    if (this.categoryTagMap[lowerTag]) {
      const categoryTags = this.categoryTagMap[lowerTag];
      // Find which category tags actually exist in the photos
      const matchingTags: string[] = [];
      
      // Get all tags from photo service (including photo/video for matching)
      const allAvailableTags = this.photoService.getAllTags();
      
      categoryTags.forEach(catTag => {
        // Try exact match first
        const exactMatch = allAvailableTags.find(availableTag => 
          availableTag.toLowerCase() === catTag.toLowerCase()
        );
        
        if (exactMatch && !matchingTags.includes(exactMatch)) {
          matchingTags.push(exactMatch);
        } else {
          // Try partial match
          const partialMatch = allAvailableTags.find(availableTag => {
            const lowerAvailable = availableTag.toLowerCase();
            const lowerCat = catTag.toLowerCase();
            return lowerAvailable.includes(lowerCat) || lowerCat.includes(lowerAvailable);
          });
          
          if (partialMatch && !matchingTags.includes(partialMatch)) {
            matchingTags.push(partialMatch);
          }
        }
      });
      
      if (matchingTags.length > 0) {
        // Select all matching tags from the category
        this.selectedTags.clear();
        matchingTags.forEach(mt => this.selectedTags.add(mt));
      } else {
        // Clear selection if category has no matching tags
        if (this.selectedTags.size > 0) {
          this.selectedTags.clear();
        }
      }
    } else {
      // Try to find a direct tag match
      const normalizedTag = this.findMatchingTag(tag);
      if (normalizedTag) {
        // Only update if the current selection doesn't match the URL tag
        // This prevents unnecessary updates when URL was changed by our own navigation
        if (this.selectedTags.size !== 1 || !this.selectedTags.has(normalizedTag)) {
          this.selectedTags.clear();
          this.selectedTags.add(normalizedTag);
        }
      } else {
        // Clear selection if tag from URL doesn't exist
        if (this.selectedTags.size > 0) {
          this.selectedTags.clear();
        }
      }
    }
  }

  /**
   * Find a matching tag from available tags (case-insensitive)
   */
  private findMatchingTag(tagParam: string): string | null {
    if (!tagParam) return null;
    
    // Get all available tags (excluding photo/video)
    const allTags = this.photoService.getAllTags().filter(tag => {
      const lowerTag = tag.toLowerCase();
      return lowerTag !== 'photo' && lowerTag !== 'video';
    });
    
    if (allTags.length === 0) return null;
    
    const lowerParam = tagParam.toLowerCase().trim();
    
    // Try exact match first (case-sensitive)
    if (allTags.includes(tagParam)) {
      return tagParam;
    }
    
    // Try case-insensitive exact match
    const exactMatch = allTags.find(tag => tag.toLowerCase() === lowerParam);
    if (exactMatch) {
      return exactMatch;
    }
    
    // Try partial match (e.g., "landscape" matches "landscape-photography" or vice versa)
    const partialMatch = allTags.find(tag => {
      const lowerTag = tag.toLowerCase();
      return lowerTag.includes(lowerParam) || lowerParam.includes(lowerTag);
    });
    if (partialMatch) {
      return partialMatch;
    }
    
    // Try plural/singular matching (e.g., "portrait" matches "portraits")
    if (lowerParam.endsWith('s')) {
      const singular = lowerParam.slice(0, -1);
      const singularMatch = allTags.find(tag => tag.toLowerCase() === singular);
      if (singularMatch) {
        return singularMatch;
      }
    } else {
      const plural = lowerParam + 's';
      const pluralMatch = allTags.find(tag => tag.toLowerCase() === plural);
      if (pluralMatch) {
        return pluralMatch;
      }
    }
    
    return null;
  }
  
  private setupSubscriptions(): void {
    combineLatest([
      this.photoService.photos$,
      this.photoService.loading$,
      this.photoService.error$,
      this.route.queryParams
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([photos, loading, error, queryParams]) => {
      // Photos updated - trigger change detection
      
      this.photos = photos;
      this.isLoading = loading;
      this.error = error;
      
      // Update tags list first (needed for tag matching)
      this.allTags = this.photoService.getAllTags().filter(tag => {
        const lowerTag = tag.toLowerCase();
        return lowerTag !== 'photo' && lowerTag !== 'video';
      });
      this.updateDisplayedTags();
      
      // Update dynamic category mapping from PhotoService
      if (photos.length > 0) {
        const categories = this.photoService.getDynamicCategories();
        this.categoryTagMap = {};
        categories.forEach(category => {
          // Store with lowercase key for consistent lookup
          this.categoryTagMap[category.name.toLowerCase()] = category.tags;
        });
      }
      
      // Check for tag query parameter after photos are loaded
      if (photos.length > 0 && !loading) {
        const tag = queryParams['tag'];
        if (tag) {
          this.processTagFromUrl(tag, photos);
        } else {
          // No tag in URL - clear selected tags if they exist
          // This handles the case when user navigates to URL without tag param
          // or when clearFilters() removes the tag param
          if (this.selectedTags.size > 0) {
            this.selectedTags.clear();
          }
        }
      } else if (photos.length === 0 && !loading && queryParams['tag']) {
        // Photos not loaded yet but tag is in URL - ensure photos are loading
        // This handles the case when navigating directly to a URL with a tag
        if (!loading) {
          this.photoService.loadPhotos();
        }
      }
      
      // Update filtered photos
      this.filterPhotos();
      
      // Mark all filtered photos as loading initially (will be cleared when they load)
      this.filteredPhotos.forEach(photo => {
        if (!this.loadingImages.has(photo.id)) {
          this.loadingImages.add(photo.id);
        }
      });
      
      // Check for cached images after DOM updates
      // Use multiple timeouts to catch images at different stages
      setTimeout(() => {
        this.checkCachedImages();
      }, 50);
      setTimeout(() => {
        this.checkCachedImages();
      }, 200);
      setTimeout(() => {
        this.checkCachedImages();
      }, 500);
      
      this.cdr.markForCheck();
      
      // Trigger change detection manually (OnPush strategy)
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    // Check all images after view init to handle cached images
    setTimeout(() => {
      this.checkCachedImages();
    }, 100);
  }
  
  /**
   * Check for cached images and make them visible immediately
   */
  private checkCachedImages(): void {
    // Use querySelector to find all images in case ViewChildren hasn't updated yet
    const allImages = document.querySelectorAll('.masonry-item img.gallery-image');
    
    allImages.forEach((imgElement) => {
      const img = imgElement as HTMLImageElement;
      const src = img.src;
      
      // Find the photo that matches this image by checking the src
      const photo = this.filteredPhotos.find(p => {
        const photoSrc = this.getPhotoSrc(p, 'grid');
        return src.includes(photoSrc) || photoSrc.includes(src) || 
               (p.sizes?.medium && src.includes(p.sizes.medium)) ||
               (p.sizes?.thumbnail && src.includes(p.sizes.thumbnail)) ||
               (p.sizes?.full && src.includes(p.sizes.full));
      });
      
      if (!photo) return;
      
      // If image is already loaded (cached), make it visible immediately
      if (img.complete && img.naturalHeight !== 0) {
        img.style.opacity = '1';
        img.style.display = 'block';
        this.loadingImages.delete(photo.id);
        
        // Ensure parent container is visible
        const parent = img.closest('.masonry-item');
        if (parent) {
          (parent as HTMLElement).style.display = 'block';
          (parent as HTMLElement).style.visibility = 'visible';
          (parent as HTMLElement).style.opacity = '1';
        }
      } else if (img.complete && img.naturalHeight === 0) {
        // Image failed to load - trigger error handler
        this.onImageError({ target: img } as any, photo);
      } else if (!img.complete) {
        // Image is still loading - ensure it's marked as loading
        this.loadingImages.add(photo.id);
      }
    });
    
    // Also check ViewChildren if available
    this.imageElements.forEach((imgRef, index) => {
      if (index < this.filteredPhotos.length) {
        const photo = this.filteredPhotos[index];
        const img = imgRef.nativeElement;
        
        if (img.complete && img.naturalHeight !== 0) {
          img.style.opacity = '1';
          img.style.display = 'block';
          this.loadingImages.delete(photo.id);
          
          const parent = img.closest('.masonry-item');
          if (parent) {
            (parent as HTMLElement).style.display = 'block';
            (parent as HTMLElement).style.visibility = 'visible';
            (parent as HTMLElement).style.opacity = '1';
          }
        }
      }
    });
    
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  
  retryLoad(): void {
    this.photoService.reloadPhotos();
  }

  toggleTag(tag: string): void {
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
    } else {
      this.selectedTags.add(tag);
    }
    this.updateUrlFromSelectedTags();
    this.filterPhotos();
    this.cdr.markForCheck();
  }

  clearFilters(): void {
    this.selectedTags.clear();
    // Navigate to remove query params when clearing filters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
    this.filterPhotos();
    this.cdr.markForCheck();
  }

  /**
   * Update URL query params based on current selected tags
   */
  private updateUrlFromSelectedTags(): void {
    if (this.selectedTags.size === 0) {
      // Remove tag param if no tags selected
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });
    } else if (this.selectedTags.size === 1) {
      // Single tag - use simple tag param
      const tag = Array.from(this.selectedTags)[0];
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tag: tag },
        replaceUrl: true
      });
    } else {
      // Multiple tags - use tag param with first tag (or could use multiple params)
      // For now, use the first tag to maintain compatibility with footer links
      const tag = Array.from(this.selectedTags)[0];
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tag: tag },
        replaceUrl: true
      });
    }
  }

  filterPhotos(): void {
    if (this.selectedTags.size === 0) {
      this.filteredPhotos = [...this.photos];
    } else {
      // Check if we're filtering by a category (which might need multiple tags)
      const selectedTagArray = Array.from(this.selectedTags);
      this.filteredPhotos = this.photoService.filterPhotosByTags(selectedTagArray);
    }
    // Mark newly filtered photos as loading (will be cleared when they load)
    this.filteredPhotos.forEach(photo => {
      if (!this.loadingImages.has(photo.id)) {
        this.loadingImages.add(photo.id);
      }
    });
    // Filter photos based on selected tags
    this.cdr.markForCheck();
  }
  
  // TrackBy function for better *ngFor performance
  trackByPhotoId(index: number, photo: Photo): string {
    return photo.id;
  }
  
  trackByTag(index: number, tag: string): string {
    return tag;
  }

  updateDisplayedTags(): void {
    if (this.showAllTags || this.allTags.length <= this.MAX_TAGS_DISPLAYED) {
      this.displayedTags = this.allTags;
    } else {
      this.displayedTags = this.allTags.slice(0, this.MAX_TAGS_DISPLAYED);
    }
  }

  toggleShowAllTags(): void {
    this.showAllTags = !this.showAllTags;
    this.updateDisplayedTags();
    this.cdr.markForCheck();
  }

  get hasMoreTags(): boolean {
    return this.allTags.length > this.MAX_TAGS_DISPLAYED;
  }

  openLightbox(index: number): void {
    this.currentPhotoIndex = index;
    this.currentPhoto = this.filteredPhotos[index];
    this.lightboxOpen = true;
    this.lightboxImageLoading = true; // Start loading state
    document.body.style.overflow = 'hidden';
    this.preloadAdjacentImages();
    this.cdr.markForCheck();
    
    // Check if image is already cached and loaded
    setTimeout(() => {
      if (this.currentPhoto) {
        const img = new Image();
        img.src = this.getPhotoSrc(this.currentPhoto, 'lightbox');
        if (img.complete && img.naturalHeight !== 0) {
          // Image is already loaded (cached)
          this.lightboxImageLoading = false;
          this.cdr.markForCheck();
        }
      }
    }, 0);
  }

  // Strip leading numeric prefixes and "Photo"/"Video" from titles for display
  getDisplayTitle(photo: Photo | null | undefined): string {
    const raw = photo?.title || photo?.alt || '';
    // Remove numeric prefix (e.g., "0024-", "0024 ", "0024.")
    let cleaned = raw.replace(/^\d+\s*[-_.]?\s*/i, '');
    // Remove "Photo" or "Video" (case-insensitive) if it appears right after the number
    cleaned = cleaned.replace(/^(photo|video)\s+/i, '');
    return cleaned;
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    this.currentPhoto = null;
    document.body.style.overflow = 'auto';
    this.cdr.markForCheck();
  }

  nextPhoto(): void {
    if (this.currentPhotoIndex < this.filteredPhotos.length - 1) {
      this.currentPhotoIndex++;
      this.currentPhoto = this.filteredPhotos[this.currentPhotoIndex];
      this.lightboxImageLoading = true; // Start loading state
      this.preloadAdjacentImages();
      this.cdr.markForCheck();
    }
  }

  previousPhoto(): void {
    if (this.currentPhotoIndex > 0) {
      this.currentPhotoIndex--;
      this.currentPhoto = this.filteredPhotos[this.currentPhotoIndex];
      this.lightboxImageLoading = true; // Start loading state
      this.preloadAdjacentImages();
      this.cdr.markForCheck();
    }
  }
  
  // Hide the first tag (media type like "photo") when rendering
  getDisplayTags(photo: Photo | null | undefined): string[] {
    if (!photo?.tags || photo.tags.length === 0) return [];
    // Filter out "photo" or "video" tags (case-insensitive) from the beginning
    return photo.tags.filter(tag => {
      const lowerTag = tag.toLowerCase();
      return lowerTag !== 'photo' && lowerTag !== 'video';
    });
  }
  
  // Preload adjacent images for smoother navigation
  private preloadAdjacentImages(): void {
    const preloadIndexes = [
      this.currentPhotoIndex - 1,
      this.currentPhotoIndex + 1
    ].filter(idx => idx >= 0 && idx < this.filteredPhotos.length);
    
    preloadIndexes.forEach(idx => {
      const photo = this.filteredPhotos[idx];
      if (photo?.sizes?.medium) {
        const img = new Image();
        img.src = photo.sizes.medium;
      }
    });
  }

  handleKeydown(event: KeyboardEvent): void {
    if (!this.lightboxOpen) return;
    
    switch(event.key) {
      case 'Escape':
        this.closeLightbox();
        break;
      case 'ArrowRight':
        this.nextPhoto();
        break;
      case 'ArrowLeft':
        this.previousPhoto();
        break;
    }
  }
  
  // Touch/swipe gesture handlers for mobile
  onTouchStart(event: TouchEvent): void {
    if (!this.lightboxOpen) return;
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }
  
  onTouchMove(event: TouchEvent): void {
    if (!this.lightboxOpen || this.touchStartX === 0) return;
    
    const touch = event.touches[0];
    const diffX = Math.abs(this.touchStartX - touch.clientX);
    const diffY = Math.abs(this.touchStartY - touch.clientY);
    
    // Only prevent default if it's clearly a horizontal swipe (more horizontal than vertical)
    // This allows vertical scrolling of the info section
    if (diffX > diffY && diffX > 10) {
      event.preventDefault();
    }
  }
  
  onTouchEnd(event: TouchEvent): void {
    if (!this.lightboxOpen || this.touchStartX === 0) return;
    
    const touch = event.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    
    const diffX = this.touchStartX - touchEndX;
    const diffY = this.touchStartY - touchEndY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);
    
    // Check if it's a horizontal swipe (more horizontal than vertical and exceeds threshold)
    if (absDiffX > absDiffY && absDiffX > this.SWIPE_THRESHOLD) {
      // It's a swipe - handle navigation
      this.swipeJustHandled = true;
      if (diffX > 0) {
        // Swiped left - go to next photo
        this.nextPhoto();
      } else {
        // Swiped right - go to previous photo
        this.previousPhoto();
      }
      // Reset flag after a short delay to prevent click event from firing
      setTimeout(() => {
        this.swipeJustHandled = false;
      }, 300);
    } else if (absDiffX < 20 && absDiffY < 20) {
      // It's a tap (minimal movement) - handle tap-on-sides navigation
      // Get the container to determine which side was tapped
      const container = (event.target as HTMLElement).closest('.lightbox-image-container') as HTMLElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width;
        const tapX = touchEndX - rect.left;
        
        // Divide into zones: left 40% = previous, right 40% = next, middle 20% = do nothing
        const leftZone = containerWidth * 0.4;
        const rightZone = containerWidth * 0.6;
        
        if (tapX < leftZone) {
          // Left side - previous photo
          if (this.currentPhotoIndex > 0) {
            this.previousPhoto();
          }
        } else if (tapX > rightZone) {
          // Right side - next photo
          if (this.currentPhotoIndex < this.filteredPhotos.length - 1) {
            this.nextPhoto();
          }
        }
      }
    }
    
    // Reset touch positions
    this.touchStartX = 0;
    this.touchStartY = 0;
  }
  
  // Tap on sides to navigate (mobile-friendly)
  onImageContainerClick(event: MouseEvent): void {
    if (!this.lightboxOpen) return;
    
    // Don't handle tap if a swipe was just processed
    if (this.swipeJustHandled) {
      return;
    }
    
    // Don't navigate if clicking on buttons or info section
    const target = event.target as HTMLElement;
    if (target.closest('.lightbox-nav') || target.closest('.lightbox-info') || target.closest('.lightbox-close')) {
      return;
    }
    
    // Get click position
    const clientX = event.clientX;
    
    // Get container bounds
    const container = (event.currentTarget as HTMLElement);
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const clickX = clientX - rect.left;
    
    // Divide into zones: left 40% = previous, right 40% = next, middle 20% = do nothing
    const leftZone = containerWidth * 0.4;
    const rightZone = containerWidth * 0.6;
    
    if (clickX < leftZone) {
      // Left side - previous photo
      if (this.currentPhotoIndex > 0) {
        this.previousPhoto();
      }
    } else if (clickX > rightZone) {
      // Right side - next photo
      if (this.currentPhotoIndex < this.filteredPhotos.length - 1) {
        this.nextPhoto();
      }
    }
    // Middle zone - do nothing (allows clicking to close if needed)
  }
  
  onImageError(event: Event, photo: Photo): void {
    const img = event.target as HTMLImageElement;
    const currentSrc = img.src;
    
    // Remove from loading set
    this.loadingImages.delete(photo.id);
    this.cdr.markForCheck();
    
    // Try fallback URLs in order (only if they're different)
    if (currentSrc === photo.sizes?.thumbnail && photo.sizes?.medium && photo.sizes.medium !== photo.sizes.thumbnail) {
      img.src = photo.sizes.medium;
      // Mark as loading again for the fallback
      this.loadingImages.add(photo.id);
      this.cdr.markForCheck();
      return;
    }
    
    if (currentSrc !== photo.sizes?.full && photo.sizes?.full && photo.sizes.full !== currentSrc) {
      img.src = photo.sizes.full;
      // Mark as loading again for the fallback
      this.loadingImages.add(photo.id);
      this.cdr.markForCheck();
      return;
    }
    
    // All URLs failed - show placeholder
    this.showImagePlaceholder(img, photo);
  }
  
  private showImagePlaceholder(img: HTMLImageElement, photo: Photo): void {
    const parent = img.closest('.masonry-item') as HTMLElement;
    if (!parent) return;
    
    // Hide the broken image
    img.style.display = 'none';
    
    // Check if placeholder already exists
    let placeholder = parent.querySelector('.image-placeholder') as HTMLElement;
    
    if (!placeholder) {
      // Create placeholder element
      placeholder = document.createElement('div');
      placeholder.className = 'image-placeholder';
      placeholder.innerHTML = `
        <div class="placeholder-icon">📷</div>
        <div class="placeholder-text">Image not available</div>
        <div class="placeholder-title">${photo.title}</div>
      `;
      parent.appendChild(placeholder);
    }
    
    placeholder.style.display = 'flex';
  }
  
  onImageLoad(event: Event, photo: Photo): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '1';
    img.style.display = 'block';
    
    // Mark image as loaded (remove from loading set)
    this.loadingImages.delete(photo.id);
    this.cdr.markForCheck();
    
    // Ensure parent container is visible
    const parent = img.closest('.masonry-item');
    if (parent) {
      (parent as HTMLElement).style.display = 'block';
      (parent as HTMLElement).style.visibility = 'visible';
    }
  }
  
  
  onImageLoadStart(event: Event, photo: Photo): void {
    // Mark image as loading (backup in case it wasn't already marked)
    this.loadingImages.add(photo.id);
    this.cdr.markForCheck();
  }
  
  isImageLoading(photo: Photo): boolean {
    return this.loadingImages.has(photo.id);
  }

  getPhotoSrc(photo: Photo, intent: 'grid' | 'lightbox' = 'grid'): string {
    if (intent === 'lightbox') {
      return photo.sizes?.full || photo.sizes?.medium || photo.sizes?.thumbnail || '';
    }
    // Grid/listing: prefer medium, then full, then thumbnail
    return photo.sizes?.medium || photo.sizes?.full || photo.sizes?.thumbnail || '';
  }
  
  // Lightbox image loading handlers
  onLightboxImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '1';
    this.lightboxImageLoading = false;
    this.cdr.markForCheck();
  }
  
  onLightboxImageLoadStart(event: Event): void {
    this.lightboxImageLoading = true;
    const img = event.target as HTMLImageElement;
    img.style.opacity = '0';
    this.cdr.markForCheck();
  }
  
  onLightboxImageError(event: Event): void {
    this.lightboxImageLoading = false;
    this.cdr.markForCheck();
    // Could show an error message here if needed
  }
}


