import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  Compass,
  Download,
  LogOut,
  Menu,
  Orbit,
  Sparkles,
  User as UserIcon,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { AuthModalMode } from './AuthModal';

export type AppMode = 'landing' | 'explorer';
export type ExplorerTab = 'mission' | 'discovery' | '3d-globe' | 'scoring-sources';

interface NavbarProps {
  appMode: AppMode;
  activeSection: string;
  explorerTab: ExplorerTab;
  accentHex: string;
  onNavigateLandingSection: (sectionId: string) => void;
  onOpenExplorer: (tab?: ExplorerTab) => void;
  onOpenAuth: (mode: AuthModalMode, reason?: string) => void;
  onExportReport?: () => void;
}

const LANDING_LINKS = [
  { id: 'hero', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'features', label: 'Features' },
  { id: 'methodology', label: 'Methodology' }
] as const;

export function Navbar({
  appMode,
  activeSection,
  explorerTab,
  accentHex,
  onNavigateLandingSection,
  onOpenExplorer,
  onOpenAuth,
  onExportReport
}: NavbarProps) {
  const { user, profile, savedExplorations, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : user?.displayName || user?.email?.split('@')[0] || 'Researcher';

  const initials = profile
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
    : displayName.slice(0, 2).toUpperCase();

  const headerBgClass =
    appMode === 'landing' && !scrolled ? 'glass-nav-transparent' : 'glass-nav';

  return (
    <header className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${headerBgClass}`}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left Zone: Brand Emblem & Wordmark */}
        <button
          type="button"
          onClick={() => onNavigateLandingSection('hero')}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer group text-left"
        >
          <span
            className="glass-box w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{ boxShadow: `0 0 18px ${accentHex}40` }}
          >
            <Orbit className="w-4.5 h-4.5 text-sky-200" />
          </span>
          <span className="font-display font-semibold tracking-tight text-sm sm:text-base text-white whitespace-nowrap">
            Twin Worlds
          </span>
          <span className="hidden xl:inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-300 border-l border-white/20 pl-2.5 whitespace-nowrap">
            Earth Analog Explorer
          </span>
        </button>

        {/* Center Zone: Desktop Navigation Links */}
        {appMode === 'landing' ? (
          <nav
            aria-label="Primary landing navigation"
            className="hidden md:flex items-center gap-1 rounded-full p-1 glass-segmented"
          >
            {LANDING_LINKS.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateLandingSection(item.id)}
                  className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="landing-nav-pill"
                      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                      className="absolute inset-0 rounded-full glass-btn-active -z-10"
                    />
                  )}
                  {item.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onOpenExplorer('mission')}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 text-sky-200 hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-sky-300" />
              Explore
            </button>
          </nav>
        ) : (
          <nav
            aria-label="Explorer navigation"
            className="hidden md:flex items-center gap-1 rounded-full p-1 glass-segmented"
          >
            <button
              type="button"
              onClick={() => onNavigateLandingSection('hero')}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              Overview
            </button>
            {(
              [
                { id: 'mission', label: 'Mission Control' },
                { id: 'discovery', label: 'Global Discovery' },
                { id: '3d-globe', label: '3D & Globe' },
                { id: 'scoring-sources', label: 'Scoring & Sources' }
              ] as const
            ).map((tab) => {
              const active = explorerTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onOpenExplorer(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    active ? 'glass-btn-active' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Zone: Auth / Profile Menu + Mobile Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {appMode === 'explorer' && onExportReport && (
            <button
              type="button"
              onClick={onExportReport}
              className="hidden sm:inline-flex items-center gap-1.5 glass-btn px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          )}

          {user ? (
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="glass-btn inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer"
              >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                  {initials}
                </span>
                <span className="max-w-[140px] truncate hidden sm:inline">{displayName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="glass-panel-deep absolute right-0 mt-2 w-64 rounded-2xl p-2 shadow-2xl"
                  >
                    <div className="px-3 py-2.5 border-b border-white/10">
                      <div className="text-xs font-semibold text-white truncate">{displayName}</div>
                      <div className="text-[11px] text-slate-400 truncate">{profile?.email ?? user.email}</div>
                      <div className="mt-1.5 font-mono text-[10px] text-sky-300">
                        {savedExplorations.length} saved analog {savedExplorations.length === 1 ? 'match' : 'matches'}
                      </div>
                    </div>

                    <div className="py-1 space-y-0.5">
                      {appMode === 'landing' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            onOpenExplorer('mission');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-100 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5 text-sky-300" />
                          Open Explorer Workspace
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            onNavigateLandingSection('hero');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-100 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                          View Landing Experience
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          setProfileMenuOpen(false);
                          await logout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-200 hover:bg-rose-500/15 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-300" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="glass-btn px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="glass-btn-primary px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden glass-btn p-2 rounded-full cursor-pointer"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-panel-deep border-t border-white/15 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {appMode === 'landing' ? (
                <>
                  {LANDING_LINKS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onNavigateLandingSection(item.id);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium cursor-pointer ${
                        activeSection === item.id ? 'glass-btn-active' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenExplorer('mission');
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-sky-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Explore Platform
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigateLandingSection('hero');
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer"
                  >
                    Landing Overview
                  </button>
                  {(
                    [
                      { id: 'mission', label: 'Mission Control' },
                      { id: 'discovery', label: 'Global Discovery' },
                      { id: '3d-globe', label: '3D & Globe' },
                      { id: 'scoring-sources', label: 'Scoring & Sources' }
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenExplorer(tab.id);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium cursor-pointer ${
                        explorerTab === tab.id ? 'glass-btn-active' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </>
              )}

              {!user ? (
                <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAuth('login');
                    }}
                    className="glass-btn py-2 rounded-full text-xs font-medium cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAuth('signup');
                    }}
                    className="glass-btn-primary py-2 rounded-full text-xs font-semibold cursor-pointer"
                  >
                    Get Started
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserIcon className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                    <span className="text-xs text-slate-100 truncate">{displayName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                    }}
                    className="text-xs text-rose-300 hover:text-rose-200 cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
