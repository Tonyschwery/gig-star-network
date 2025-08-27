import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Calendar, 
  MessageSquare, 
  Settings, 
  BarChart3, 
  FileText, 
  Ban, 
  DollarSign,
  Home,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const adminRoutes = [
  { path: '/admin', label: 'Dashboard', icon: Home },
  { path: '/admin/users', label: 'User Management', icon: Users },
  { path: '/admin/bookings', label: 'Booking Management', icon: Calendar },
  { path: '/admin/payments', label: 'Payment Management', icon: DollarSign },
  { path: '/admin/messages', label: 'Message Center', icon: MessageSquare },
  { path: '/admin/event-requests', label: 'Event Requests', icon: FileText },
  { path: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { path: '/admin/settings', label: 'System Settings', icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();
  const { adminPermissions } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  // Auto-collapse on mobile
  const isCollapsed = isMobile || collapsed;
  const showOverlay = isMobile && mobileMenuOpen;

  return (
    <>
      {/* Mobile Overlay */}
      {showOverlay && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Button */}
      {isMobile && !showOverlay && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(true)}
          className="fixed top-4 left-4 z-50 lg:hidden bg-background border shadow-md"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Sidebar */}
      <div className={cn(
        "bg-card border-r border-border transition-all duration-300 flex flex-col",
        // Desktop behavior
        "lg:relative lg:translate-x-0",
        // Mobile behavior
        isMobile && "fixed left-0 top-0 z-50 h-screen",
        isMobile && !showOverlay && "-translate-x-full",
        isMobile && showOverlay && "translate-x-0",
        // Width
        isCollapsed && !showOverlay ? "w-16" : "w-64"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          {(!isCollapsed || showOverlay) && (
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-primary mr-2" />
              <span className="font-semibold text-sm lg:text-base">Admin Panel</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {/* Mobile close button */}
            {isMobile && showOverlay && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {/* Desktop collapse button */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
                className="h-8 w-8 p-0"
              >
                {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-2 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {adminRoutes.map((route) => {
              const hasPermission = adminPermissions.includes('all') || 
                adminPermissions.some(perm => route.path.includes(perm));
              
              if (!hasPermission) return null;

              return (
                <NavLink
                  key={route.path}
                  to={route.path}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors group",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      "touch-manipulation" // Better touch experience on mobile
                    )
                  }
                >
                  <route.icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    (isCollapsed && !showOverlay) ? "" : "mr-3"
                  )} />
                  {(!isCollapsed || showOverlay) && (
                    <span className="truncate">{route.label}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Permissions Display */}
        {(!isCollapsed || showOverlay) && (
          <div className="p-4 border-t flex-shrink-0">
            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-2">Permissions:</div>
              <div className="bg-muted p-2 rounded text-xs break-words">
                {adminPermissions.includes('all') ? 'Full Access' : adminPermissions.join(', ')}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}