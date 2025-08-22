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

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={cn(
      "bg-card border-r border-border transition-all duration-200",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-primary mr-2" />
            <span className="font-semibold">Admin Panel</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-2">
        <div className="space-y-1">
          {adminRoutes.map((route) => {
            const hasPermission = adminPermissions.includes('all') || 
              adminPermissions.some(perm => route.path.includes(perm));
            
            if (!hasPermission) return null;

            return (
              <NavLink
                key={route.path}
                to={route.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )
                }
              >
                <route.icon className={cn("h-4 w-4", collapsed ? "" : "mr-3")} />
                {!collapsed && <span>{route.label}</span>}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Permissions Display */}
      {!collapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-xs text-muted-foreground">
            <div className="font-medium mb-1">Permissions:</div>
            <div className="bg-muted p-2 rounded text-xs">
              {adminPermissions.includes('all') ? 'Full Access' : adminPermissions.join(', ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}