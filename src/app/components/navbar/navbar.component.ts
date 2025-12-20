import { Component, HostListener, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  isMenuOpen = false;
  isScrolled = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    public themeService: ThemeService
  ) {
    // Use NgZone to optimize scroll handling
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', () => {
        const scrolled = window.scrollY > 50;
        if (scrolled !== this.isScrolled) {
          this.ngZone.run(() => {
            this.isScrolled = scrolled;
            this.cdr.markForCheck();
          });
        }
      }, { passive: true });
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // This is now handled in constructor for better performance
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    
    // Prevent body scroll when menu is open (iOS Safari compatible)
    if (this.isMenuOpen) {
      this.lockBodyScroll();
    } else {
      this.unlockBodyScroll();
    }
    this.cdr.markForCheck();
  }

  closeMenu(): void {
    this.isMenuOpen = false;
    this.unlockBodyScroll();
    this.cdr.markForCheck();
  }

  /**
   * Lock body scroll - iOS Safari compatible method
   * Uses position fixed instead of overflow hidden for better iOS support
   */
  private lockBodyScroll(): void {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    // Store scroll position for restoration
    (document.body as any).scrollY = scrollY;
  }

  /**
   * Unlock body scroll - iOS Safari compatible method
   */
  private unlockBodyScroll(): void {
    const scrollY = (document.body as any).scrollY || 0;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    // Restore scroll position
    window.scrollTo(0, scrollY);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.cdr.markForCheck();
  }

  isDarkMode(): boolean {
    return this.themeService.currentTheme() === 'dark';
  }
}
