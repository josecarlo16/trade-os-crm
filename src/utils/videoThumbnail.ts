/**
 * Video Thumbnail Generator
 * Extracts the first frame from a video file to use as a preview thumbnail
 */

export interface ThumbnailResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Extracts a frame from a video file at a specified time
 * @param videoFile - The video file to extract a frame from
 * @param seekTime - Time in seconds to capture the frame (default: 0.1 for first frame)
 * @param maxWidth - Maximum width of the thumbnail (default: 640)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Promise with the thumbnail blob and metadata
 */
export async function generateVideoThumbnail(
  videoFile: File,
  seekTime: number = 0.1,
  maxWidth: number = 640,
  quality: number = 0.8
): Promise<ThumbnailResult> {
  return new Promise((resolve, reject) => {
    // Create video element
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    // Create object URL for the video file
    const videoUrl = URL.createObjectURL(videoFile);
    
    // Cleanup function
    const cleanup = () => {
      URL.revokeObjectURL(videoUrl);
      video.remove();
    };

    // Handle video load
    video.onloadedmetadata = () => {
      // Seek to the specified time (or start if video is too short)
      video.currentTime = Math.min(seekTime, video.duration);
    };

    video.onseeked = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = video.videoWidth / video.videoHeight;
        let width = Math.min(video.videoWidth, maxWidth);
        let height = Math.round(width / aspectRatio);

        // Create canvas and draw the video frame
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              cleanup();
              reject(new Error('Failed to generate thumbnail blob'));
              return;
            }

            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            
            cleanup();
            resolve({
              blob,
              dataUrl,
              width,
              height,
            });
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video for thumbnail generation'));
    };

    // Set source and start loading
    video.src = videoUrl;
    video.load();
  });
}

/**
 * Creates a File object from a thumbnail blob
 * @param blob - The thumbnail blob
 * @param originalFileName - Original video filename for naming
 * @returns File object for the thumbnail
 */
export function createThumbnailFile(blob: Blob, originalFileName: string): File {
  const baseName = originalFileName.replace(/\.[^/.]+$/, '');
  const thumbnailName = `${baseName}_thumb.jpg`;
  return new File([blob], thumbnailName, { type: 'image/jpeg' });
}
