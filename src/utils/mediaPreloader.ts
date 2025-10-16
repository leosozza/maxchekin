export type MediaType = 'image' | 'video';

export class MediaPreloader {
  private cache = new Map<string, HTMLImageElement | HTMLVideoElement>();
  private loading = new Map<string, Promise<void>>();

  async preloadNext(url: string, type: MediaType): Promise<void> {
    // Return existing promise if already loading
    if (this.loading.has(url)) {
      return this.loading.get(url);
    }

    // Return immediately if already cached
    if (this.cache.has(url)) {
      return Promise.resolve();
    }

    const loadPromise = this.load(url, type);
    this.loading.set(url, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.loading.delete(url);
    }
  }

  private load(url: string, type: MediaType): Promise<void> {
    return new Promise((resolve, reject) => {
      if (type === 'image') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this.cache.set(url, img);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      } else {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.preload = 'auto';
        video.onloadeddata = () => {
          this.cache.set(url, video);
          resolve();
        };
        video.onerror = reject;
        video.src = url;
      }
    });
  }

  get(url: string): HTMLImageElement | HTMLVideoElement | null {
    return this.cache.get(url) || null;
  }

  clear(): void {
    this.cache.clear();
    this.loading.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}
