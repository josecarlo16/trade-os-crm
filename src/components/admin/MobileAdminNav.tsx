import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import truficientLogo from '@/assets/truficient-logo.webp';
import { useUserRole } from '@/hooks/useUserRole';
import { useRolePermissions, hasPermission } from '@/hooks/useRolePermissions';
import { navSections } from './adminNavConfig';

interface MobileAdminNavProps {
  onClose: () => void;
}

export const MobileAdminNav = ({ onClose }: MobileAdminNavProps) => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { permissions } = useRolePermissions();

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleNavClick = () => {
    onClose();
  };

  // Filter sections and items based on permissions
  const visibleSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => 
        hasPermission(permissions, item.permissionKey, isSuperAdmin)
      ),
    }))
    .filter(section => section.items.length > 0);

  return (
    <div className="bg-[#1e3a5f] h-full flex flex-col">
      {/* Logo Section */}
      <div className="p-4 border-b border-white/10">
        <Link to="/admin" className="flex items-center gap-3" onClick={handleNavClick}>
          <img 
            src={truficientLogo} 
            alt="Truficient" 
            className="h-10 w-10 object-contain rounded"
          />
          <span className="text-white font-semibold text-lg">Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {visibleSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-3">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/admin' && location.pathname.startsWith(item.href));
                  
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                          isActive 
                            ? "bg-[#d4a84b] text-[#1e3a5f] font-medium" 
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="ml-2">Sign Out</span>
        </Button>
      </div>
    </div>
  );
};
