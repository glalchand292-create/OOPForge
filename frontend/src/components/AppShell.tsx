import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Map as MapIcon,
  BookOpen,
  Code2,
  Terminal,
  GitCompare,
  Boxes,
  Layers,
  Timer,
  RotateCcw,
  CalendarDays,
  Settings,
  Search,
  Sun,
  Moon,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Menu,
} from "lucide-react";
import { api, SearchResult } from "../lib/api";
import { Badge } from "./Badge";

interface AppShellProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  compilerAvailable: boolean;
  compilerName: string;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/roadmap", label: "Learning Roadmap", icon: MapIcon },
  { to: "/theory", label: "Theory Questions", icon: BookOpen },
  { to: "/coding", label: "Coding Arena", icon: Code2 },
  { to: "/outputs", label: "Output Arena", icon: Terminal },
  { to: "/comparisons", label: "Comparisons", icon: GitCompare },
  { to: "/designs", label: "Real-World Designs", icon: Boxes },
  { to: "/solid-modern", label: "SOLID & Modern C++", icon: Layers },
  { to: "/mocks", label: "Mock Interviews", icon: Timer },
  { to: "/revisions", label: "Revision Center", icon: RotateCcw },
  { to: "/study-plan", label: "Study Plan", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const AppShell: React.FC<AppShellProps> = ({
  theme,
  onToggleTheme,
  compilerAvailable,
  compilerName,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Periodic active study ping every 60s while tab is visible
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        const mod = location.pathname.split("/")[1] || "dashboard";
        api.logStudyTime(60, mod).catch(() => {});
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (!searchOpen) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      api
        .search(trimmed)
        .then((res) => setResults(res.results))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 180);
    return () => clearTimeout(t);
  }, [query, searchOpen]);

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="h-14 px-3.5 flex items-center justify-between border-b border-[var(--border-subtle)] shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/favicon.svg" alt="OOPForge" className="w-7 h-7 rounded-md shrink-0" />
            <div className="truncate">
              <div className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                OOPForge
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate">
                C++17 Interview Mastery
              </div>
            </div>
          </div>
        ) : (
          <img src="/favicon.svg" alt="OOPForge" className="w-7 h-7 rounded-md mx-auto" />
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:inline-flex p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-sky-500/25"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent"
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
          <div className="font-medium text-[var(--text-secondary)]">Standard: ISO C++17</div>
          <div>32 Topics · 201 Q&A · 51 Code · 52 Output</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] transition-all duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] z-10">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-4 lg:px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] transition-colors w-56 sm:w-80 text-left cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1">Search topics, C++ concepts, puzzles...</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono">
                Ctrl+K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <Badge variant={compilerAvailable ? "success" : "warning"}>
              <Cpu className="w-3 h-3" />
              <span className="hidden sm:inline">
                {compilerAvailable ? `C++17 (${compilerName})` : "Editor-Only Mode"}
              </span>
            </Badge>

            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 flex items-start justify-center pt-[10vh] px-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-[var(--border-strong)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
              <Search className="w-4 h-4 text-[var(--text-muted)]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any of 32 topics, 201 questions, 51 coding problems, 52 output puzzles, 22 tables, 20 designs..."
                className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border-subtle)]">
              {!query.trim() && (
                <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                  Type keywords like <span className="font-mono text-[var(--accent)]">virtual destructor</span>,{" "}
                  <span className="font-mono text-[var(--accent)]">diamond</span>,{" "}
                  <span className="font-mono text-[var(--accent)]">Rule of 5</span>, or{" "}
                  <span className="font-mono text-[var(--accent)]">LRU</span>.
                </div>
              )}
              {searching && (
                <div className="p-6 text-center text-xs text-[var(--text-muted)]">Searching...</div>
              )}
              {!searching && query.trim() && results.length === 0 && (
                <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                  No matching items found.
                </div>
              )}
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    navigate(item.route);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] truncate">{item.subtitle}</div>
                  </div>
                  <Badge variant="accent">{item.type}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
