import { ReactNode, useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface DeferredWidgetProps {
  children: ReactNode;
  /** Estimated height of the widget so layout doesn't jump */
  minHeight?: number;
  /** Distance from viewport at which to start mounting */
  rootMargin?: string;
  /** Optional className for the wrapper */
  className?: string;
}

/**
 * Defers mounting of a widget until it's about to enter the viewport.
 * Massively reduces initial render work for dashboard pages with many cards.
 */
export const DeferredWidget = ({
  children,
  minHeight = 200,
  rootMargin = '300px',
  className,
}: DeferredWidgetProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      // SSR / very old browsers — render immediately
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(e => e.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldRender, rootMargin]);

  return (
    <div ref={ref} className={className} style={!shouldRender ? { minHeight } : undefined}>
      {shouldRender ? children : <Skeleton className="w-full h-full rounded-lg" style={{ minHeight }} />}
    </div>
  );
};
