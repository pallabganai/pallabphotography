export interface Photo {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  sizes?: {
    thumbnail?: string;
    medium?: string;
    full?: string;
  };
  uploadDate: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface PhotosData {
  photos: Photo[];
  lastUpdated: string;
}


