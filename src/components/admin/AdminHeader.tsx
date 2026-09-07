import { useAuth } from '@/hooks/useAuth';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ExternalLink, User, Menu, Building2 } from 'lucide-react';
import { NotificationBell } from './notifications/NotificationBell';
import { GlobalSearch } from './GlobalSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminHeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export const AdminHeader = ({ title, onMenuClick }: AdminHeaderProps) => {
  const { user, signOut } = useAuth();
  const { tenantName } = useCurrentTenant();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-white border-b border-border px-4 lg:px-6 py-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger menu - mobile only (hidden on tablet and up) */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden flex-shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>
        
        <h1 className="text-xl lg:text-2xl font-semibold text-foreground truncate">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
        {tenantName && (
          <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 py-1.5">
            <Building2 className="h-3.5 w-3.5" />
            {tenantName}
          </Badge>
        )}
        <GlobalSearch />
        <NotificationBell />
        <Button variant="outline" size="sm" asChild className="hidden sm:flex">
          <Link to="/" target="_blank">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Site
          </Link>
        </Button>
        
        <Button variant="outline" size="icon" asChild className="sm:hidden">
          <Link to="/" target="_blank">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#1e3a5f] flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="hidden md:inline text-sm truncate max-w-[150px]">
                {user?.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground truncate">
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
