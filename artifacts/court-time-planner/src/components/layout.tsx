import { Link, useLocation } from "wouter";
import { LayoutDashboard, Calendar, Users, SlidersHorizontal, List, Activity, CheckCircle, Moon, Sun, Menu, X } from "lucide-react";
import { ReactNode, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/roster", label: "Roster", icon: Users },
  { path: "/priorities", label: "Priorities", icon: SlidersHorizontal },
  { path: "/cause-list", label: "Cause List", icon: List },
  { path: "/impact", label: "Impact", icon: Activity },
  { path: "/finalise", label: "Finalise", icon: CheckCircle },
];

// Keep the source in one place so the transparent emblem can be swapped without
// changing the shared shell. The production asset lives in public/branding.
const BRAND_EMBLEM_SRC = `${import.meta.env.BASE_URL}branding/court-emblem-white.png`;

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [role, setRole] = useState(() => localStorage.getItem("planner-role") || "Judge");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark") || localStorage.getItem("planner-theme") === "dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark", !dark);
    localStorage.setItem("planner-theme", dark ? "light" : "dark");
    setDark(!dark);
  };

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground flex-col md:flex-row font-sans selection:bg-primary/20">
      {/* Mobile Top Bar */}
      <header className="print-hidden md:hidden flex items-center justify-between p-3 border-b border-border bg-[#162b46] text-white sticky top-0 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src={BRAND_EMBLEM_SRC} alt="National emblem" className="h-8 w-8 object-contain shrink-0" />
          <h1 className="font-serif font-semibold text-[17px] tracking-tight truncate">Cause List Configuration</h1>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation" aria-expanded={mobileMenuOpen} aria-controls="planner-navigation">
          <Menu className="w-6 h-6" />
        </Button>
      </header>

      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      <aside id="planner-navigation" className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-sidebar border-r border-border flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="m-4 mb-3 p-4 rounded-2xl flex items-center justify-between bg-[#162b46] text-white shadow-lg shadow-[#162b46]/20 md:block">
          <div className="flex items-center gap-3">
            <img src={BRAND_EMBLEM_SRC} alt="National emblem" className="w-10 h-10 object-contain shrink-0" />
            <div>
              <h1 className="font-serif font-bold text-[16px] leading-tight tracking-tight">Cause List Configuration</h1>
              <p className="text-[11px] text-white/65 font-medium uppercase tracking-wider">Justice Sehgal's Chamber</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10 hover:text-white" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                href={item.path} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' 
                    : 'text-sidebar-foreground hover:bg-black/5 dark:hover:bg-white/10 active:scale-95'
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 m-4 mt-auto rounded-2xl bg-card border shadow-sm text-sm space-y-4">
          <div className="text-center pb-2 border-b border-border/50">
            <p className="font-semibold text-[13px]">Justice Sehgal</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Chamber Dashboard</p>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-1" htmlFor="role-switch">Role</label>
              <select 
                id="role-switch" 
                value={role} 
                onChange={e => { setRole(e.target.value); localStorage.setItem("planner-role", e.target.value); }} 
                className="w-full bg-sidebar/50 border-0 ring-1 ring-inset ring-border rounded-lg p-2 text-[14px] text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                <option>Judge</option>
                <option>Court Master</option>
              </select>
            </div>
            <button 
              type="button" 
              onClick={toggleTheme} 
              className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-[14px] font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all" 
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                {dark ? "Light Theme" : "Dark Theme"}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background md:rounded-tl-[2.5rem] md:shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.1)] overflow-hidden border-l border-border relative z-0">
        <div className="flex-1 p-4 sm:p-6 md:p-10 max-w-5xl w-full mx-auto overflow-auto scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}