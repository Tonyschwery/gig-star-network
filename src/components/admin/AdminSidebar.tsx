// FILE: src/components/admin/AdminSidebar.tsx

import { NavLink } from 'react-router-dom';
import { Home, Users, Book } from 'lucide-react';

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

export function AdminSidebar() {
  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <a href="/admin" className="flex items-center gap-2 font-semibold">
            <span className="">QTalent Admin</span>
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
    </div>
  );
}