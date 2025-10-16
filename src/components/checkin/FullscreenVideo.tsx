interface FullscreenVideoProps {
  url: string;
  title?: string;
  showControls?: boolean;
}

export function FullscreenVideo({ url, title, showControls = false }: FullscreenVideoProps) {
  // Extract video ID based on platform
  const getEmbedUrl = (videoUrl: string): string => {
    // YouTube
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.includes('youtu.be')
        ? videoUrl.split('youtu.be/')[1]?.split('?')[0]
        : new URL(videoUrl).searchParams.get('v');
      
      // For screensaver (no controls), hide all YouTube branding and info
      if (!showControls) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&autohide=1`;
      }
      
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&showinfo=0&rel=0&modestbranding=1`;
    }
    
    // Vimeo
    if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.split('vimeo.com/')[1]?.split('?')[0];
      
      if (!showControls) {
        return `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&background=1&controls=0&title=0&byline=0&portrait=0`;
      }
      
      return `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&controls=1`;
    }
    
    // Direct video file
    return videoUrl;
  };

  const embedUrl = getEmbedUrl(url);
  const isDirectVideo = !url.includes('youtube') && !url.includes('vimeo');

  return (
    <div className="relative w-full h-full bg-black">
      {isDirectVideo ? (
        <video
          className="w-full h-full object-cover"
          src={embedUrl}
          autoPlay
          muted
          loop
          playsInline
          controls={showControls}
        />
      ) : (
        <iframe
          className="w-full h-full"
          src={embedUrl}
          allow="autoplay; fullscreen"
          allowFullScreen
          style={{ border: 'none' }}
        />
      )}
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
      
      {/* Optional discrete title */}
      {title && (
        <div className="absolute bottom-8 left-8 z-10">
          <p className="text-white/60 text-sm font-light tracking-wide">
            {title}
          </p>
        </div>
      )}
    </div>
  );
}
