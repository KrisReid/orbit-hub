import { useState, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { api } from '@/api/client';
import {
  LayoutDashboard,
  Target,
  FolderKanban,
  Rocket,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Check,
  Pin,
  PinOff,
} from 'lucide-react';
import clsx from 'clsx';

// Constants for pinned boards storage
const PINNED_BOARDS_STORAGE_KEY = 'pinned_board_slugs';

// Helper functions for pinned boards
function getPinnedBoards(): string[] {
  try {
    const saved = localStorage.getItem(PINNED_BOARDS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function savePinnedBoards(slugs: string[]): void {
  localStorage.setItem(PINNED_BOARDS_STORAGE_KEY, JSON.stringify(slugs));
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Themes', href: '/themes', icon: Target },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Releases', href: '/releases', icon: Rocket },
];

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [boardsOpen, setBoardsOpen] = useState(true);
  const [pinnedSlugs, setPinnedSlugs] = useState<string[]>(() => getPinnedBoards());

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.teams.list(),
  });

  // Sort teams with pinned ones at the top
  const sortedTeams = useMemo(() => {
    if (!teams?.items) return [];
    
    const pinned = teams.items.filter(t => pinnedSlugs.includes(t.slug));
    const unpinned = teams.items.filter(t => !pinnedSlugs.includes(t.slug));
    
    // Sort pinned by their order in pinnedSlugs array
    pinned.sort((a, b) => pinnedSlugs.indexOf(a.slug) - pinnedSlugs.indexOf(b.slug));
    
    return [...pinned, ...unpinned];
  }, [teams?.items, pinnedSlugs]);

  const togglePinBoard = (slug: string) => {
    let newPinned: string[];
    if (pinnedSlugs.includes(slug)) {
      newPinned = pinnedSlugs.filter(s => s !== slug);
    } else {
      newPinned = [...pinnedSlugs, slug];
    }
    setPinnedSlugs(newPinned);
    savePinnedBoards(newPinned);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">PM</span>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Core PM</span>
            </Link>
            <button
              className="lg:hidden p-2 -mr-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = item.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}

            {/* Boards section */}
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setBoardsOpen(!boardsOpen)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>Boards</span>
                <ChevronDown
                  className={clsx(
                    'w-4 h-4 transition-transform',
                    boardsOpen ? 'rotate-180' : ''
                  )}
                />
              </button>
              {boardsOpen && (
                <div className="mt-2 space-y-1">
                  {sortedTeams.map((team) => {
                    const isPinned = pinnedSlugs.includes(team.slug);
                    return (
                      <div
                        key={team.id}
                        className="group flex items-center"
                      >
                        <Link
                          to={`/board/${team.slug}`}
                          className={clsx(
                            'flex-1 flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                            location.pathname === `/board/${team.slug}`
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          )}
                        >
                          <div className={clsx(
                            'w-2 h-2 rounded-full',
                            isPinned ? 'bg-primary-500' : 'bg-current'
                          )} />
                          {team.name}
                          {isPinned && (
                            <Pin className="h-3 w-3 text-primary-500 ml-auto" />
                          )}
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePinBoard(team.slug);
                          }}
                          className={clsx(
                            'p-1.5 rounded transition-all mr-1',
                            isPinned
                              ? 'text-primary-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100'
                          )}
                          title={isPinned ? 'Unpin board' : 'Pin board'}
                        >
                          {isPinned ? (
                            <PinOff className="h-3.5 w-3.5" />
                          ) : (
                            <Pin className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Settings link (admin only) */}
          {user?.role === 'admin' && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/settings"
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  location.pathname.startsWith('/settings')
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            </div>
          )}

          {/* User menu */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="relative">
              <button
                className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white font-medium text-sm">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium truncate text-gray-900 dark:text-white">{user?.full_name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                </div>
                <ChevronDown className={clsx('w-4 h-4 text-gray-400 transition-transform', userMenuOpen && 'rotate-180')} />
              </button>

              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setUserMenuOpen(false)} 
                  />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                    {/* Theme Section */}
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Appearance
                      </span>
                    </div>
                    {themeOptions.map((t) => {
                      const ThemeIcon = t.icon;
                      const isActive = theme === t.value;
                      return (
                        <button
                          key={t.value}
                          onClick={() => {
                            setTheme(t.value);
                          }}
                          className={clsx(
                            'flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors',
                            isActive
                              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          )}
                        >
                          <ThemeIcon className="w-4 h-4" />
                          {t.label}
                          {isActive && (
                            <Check className="w-4 h-4 ml-auto" />
                          )}
                        </button>
                      );
                    })}
                    
                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    
                    {/* Sign out */}
                    <button
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
