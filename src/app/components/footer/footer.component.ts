import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PhotoService } from '../../services/photo.service';
import { Subject, takeUntil } from 'rxjs';

interface Category {
  name: string;
  displayName: string;
  tags: string[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  categories: Category[] = [];
  private destroy$ = new Subject<void>();

  constructor(private photoService: PhotoService) {}

  ngOnInit(): void {
    // Load photos first
    this.photoService.loadPhotos();

    // Subscribe to photos to update categories when photos are loaded
    this.photoService.photos$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.categories = this.photoService.getDynamicCategories();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}


