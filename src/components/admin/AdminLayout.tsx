import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Home, Users, Book, LogOut, Menu } from 'lucide-react';
import { ModeSwitch } from '../ModeSwitch';
import { ChatProvider } from '@/contexts/ChatContext';
import { UniversalChat } from '@/components/UniversalChat';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';

const AdminNavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      `flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
        isActive ? '!text-primary bg-muted' : ''
      }`
    }
  >
    {children}
  </NavLink>
);

const AdminSidebar = () => (
  <div className="flex h-full max-h-screen flex-col gap-2">
    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
      <a href="/admin" className="flex items-center gap-2 font-semibold">
        <span>QTalent Admin</span>
      </a>
    </div>
    <div className="flex-1">
      <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
        <AdminNavLink to="/admin">
          <Home className="h-4 w-4" />
          Dashboard
        </AdminNavLink>
        <AdminNavLink to="/admin/bookings">
          <Book className="h-4 w-4" />
          Bookings
        </AdminNavLink>
        <AdminNavLink to="/admin/users">
          <Users className="h-4 w-4" />
          Users
        </AdminNavLink>
      </nav>
    </div>
  </div>
);

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ChatProvider>
      <UniversalChat />
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        {/* Desktop Sidebar */}
        <div className="hidden border-r bg-muted/40 md:block">
          <AdminSidebar />
        </div>
        
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            {/* Mobile Menu Trigger */}
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <AdminSidebar />
                </SheetContent>
              </Sheet>
            )}
            
            <div className="w-full flex-1" />
            <ModeSwitch />
            <NotificationCenter />
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden sm:inline">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ChatProvider>
  );
}