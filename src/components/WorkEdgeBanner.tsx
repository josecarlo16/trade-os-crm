import { useButtonTracking } from '@/hooks/useButtonTracking';
import workedgeProLogo from '@/assets/workedge-pro-logo.webp';

interface WorkEdgeBannerProps {
  location: string;
  variant?: 'default' | 'document';
}

export const WorkEdgeBanner = ({ location, variant = 'default' }: WorkEdgeBannerProps) => {
  const { trackButtonClick } = useButtonTracking();

  const handleClick = () => {
    trackButtonClick({
      buttonName: 'Workedge Pro Banner',
      buttonLocation: location,
      destinationUrl: 'https://workedge.pro',
    });
  };

  if (variant === 'document') {
    return (
      <a 
        href="https://workedge.pro" 
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors border"
        onClick={handleClick}
      >
        <img 
          src={workedgeProLogo} 
          alt="Workedge Pro" 
          className="w-12 h-12 object-contain flex-shrink-0"
        />
        <p className="text-sm">
          <span className="text-muted-foreground">Powered by </span>
          <span className="font-bold text-primary">Workedge Pro</span>
          <span className="text-muted-foreground"> – A Field Documentation App for Service Pros.</span>
        </p>
      </a>
    );
  }

  return (
    <a 
      href="https://workedge.pro" 
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors border border-amber-200 dark:border-amber-900"
      onClick={handleClick}
    >
      <img 
        src={workedgeProLogo} 
        alt="Workedge Pro" 
        className="w-12 h-12 object-contain flex-shrink-0"
      />
      <p className="text-sm text-amber-800 dark:text-amber-200">
        <strong className="font-medium">Powered by Workedge Pro</strong> – A Field Documentation App for Service Pros.
      </p>
    </a>
  );
};
