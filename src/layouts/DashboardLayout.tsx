import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Send,
  Search,
  Users,
  LogOut,
  Menu,
  X,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  activePage: string;
  onNavigate: (page: string) => void;
  children: ReactNode;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scheduled', label: 'Scheduled Emails', icon: Clock },
  { id: 'sent', label: 'Sent Emails', icon: Send },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'senders', label: 'Senders', icon: Users },
];

export function DashboardLayout({
  activePage,
  onNavigate,
  children,
}: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = (profile?.full_name || profile?.email || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar — desktop */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-40 transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="px-5 py-5 border-b border-gray-100">
          <Logo />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setSidebarOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                activePage === item.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || profile.email}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Logo size="sm" />
          <div className="w-9" />
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
