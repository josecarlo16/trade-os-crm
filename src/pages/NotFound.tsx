import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);

    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    const prevRobots = robotsMeta.content;
    robotsMeta.content = 'noindex, nofollow';

    document.title = 'Page Not Found | Truficient Energy Solutions';

    return () => {
      robotsMeta.content = prevRobots || 'index, follow';
    };
  }, [location.pathname]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="relative overflow-hidden rounded-2xl border border-border shadow-xl bg-background">
          <video
            ref={videoRef}
            src="/videos/404-magic-smoke.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="block w-full h-auto"
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={toggleMute}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className="absolute bottom-3 right-3 rounded-full shadow-md"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>

        <div className="text-center mt-8">
          <h1 className="mb-2 text-5xl font-bold tracking-tight">404</h1>
          <p className="mb-6 text-lg text-muted-foreground">
            Looks like the magic smoke escaped from this page.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
