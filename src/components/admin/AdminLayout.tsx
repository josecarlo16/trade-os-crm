import { ReactNode, useEffect, useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { MobileAdminNav } from './MobileAdminNav';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.title = `${title} | Admin - Truficient`;
  }, [title]);

  useEffect(() => {
    const existingMeta = document.querySelector('meta[name="robots"]');
    const meta = existingMeta || document.createElement('meta');
    meta.setAttribute('name', 'robots');
    meta.setAttribute('content', 'noindex, nofollow');
    
    if (!existingMeta) {
      document.head.appendChild(meta);
    }
    
    return () => {
      if (meta.parentNode) {
        meta.setAttribute('content', 'index, follow');
      }
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64 border-0">
          <MobileAdminNav onClose={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>
      
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader 
          title={title} 
          onMenuClick={() => setMobileMenuOpen(true)} 
        />
        <main className="flex-1 p-4 lg:p-6 overflow-auto thin-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};
