import { Link, useLocation } from 'react-router-dom';
import { LogOut, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import truficientLogo from '@/assets/truficient-logo.webp';
import { useUserRole } from '@/hooks/useUserRole';
import { useRolePermissions, hasPermission } from '@/hooks/useRolePermissions';
import { navSections } from './adminNavConfig';
import { useOpenSeoActions } from '@/hooks/useOpenSeoActions';
import { useNewSubmissionsCount } from '@/hooks/useNewSubmissionsCount';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const STORAGE_KEY = 'admin-sidebar-sections';

export const AdminSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { permissions, loading: permissionsLoading } = useRolePermissions();
  const openSeoActions = useOpenSeoActions();
  const newSubmissions = useNewSubmissionsCount();
  const [collapsed, setCollapsed] = useState(false);
  
  // Initialize expanded sections from localStorage or default all open
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    // Default: all sections expanded
    return navSections.reduce((acc, section) => {
      acc[section.title] = true;
      return acc;
    }, {} as Record<string, boolean>);
  });

  // Persist expanded sections to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedSections));
  }, [expandedSections]);

  const handleSignOut = async () => {
    await signOut();
  };

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
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
    <aside 
      className={cn(
        "bg-[#1e3a5f] min-h-screen flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-white/10">
        <Link to="/admin" className="flex items-center gap-3">
          <img 
            src={truficientLogo} 
            alt="Truficient" 
            className="h-10 w-10 object-contain rounded"
          />
          {!collapsed && (
            <span className="text-white font-semibold text-lg">Admin</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {visibleSections.map((section) => (
            <Collapsible
              key={section.title}
              open={collapsed ? false : expandedSections[section.title]}
              onOpenChange={() => !collapsed && toggleSection(section.title)}
            >
              {!collapsed ? (
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider hover:text-white/70 transition-colors">
                  <span>{section.title}</span>
                  <ChevronDown 
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      expandedSections[section.title] ? "rotate-0" : "-rotate-90"
                    )} 
                  />
                </CollapsibleTrigger>
              ) : null}
              
              <CollapsibleContent className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/admin' && location.pathname.startsWith(item.href));
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isActive
                          ? "bg-[#d4a84b] text-[#1e3a5f] font-medium"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          <span>{item.label}</span>
                          {item.href === '/admin/seo' && openSeoActions > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#FFB547] text-[#1e3a5f] text-[10px] font-semibold">
                              {openSeoActions}
                            </span>
                          )}
                          {item.href === '/admin/submissions' && newSubmissions > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#FFB547] text-[#1e3a5f] text-[10px] font-semibold">
                              {newSubmissions}
                            </span>
                          )}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </CollapsibleContent>

              {/* Show items directly when sidebar is collapsed */}
              {collapsed && (
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.href || 
                      (item.href !== '/admin' && location.pathname.startsWith(item.href));
                    
                    return (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          className={cn(
                            "flex items-center justify-center p-2 rounded-lg transition-colors",
                            isActive 
                              ? "bg-[#d4a84b] text-[#1e3a5f]" 
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                          )}
                          title={item.label}
                        >
                          <item.icon className="h-5 w-5" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Collapsible>
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
};
