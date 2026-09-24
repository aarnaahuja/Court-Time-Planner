import { Link, useLocation } from "wouter";
import { LayoutDashboard, Calendar, Users, SlidersHorizontal, List, Activity, CheckCircle, Scale, Moon, Sun } from "lucide-react";
import { ReactNode, useState } from "react";

const navItems = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/roster", label: "Roster", icon: Users },
  { path: "/priorities", label: "Priorities", icon: SlidersHorizontal },
  { path: "/cause-list", label: "Cause List", icon: List },
  { path: "/impact", label: "Impact", icon: Activity },
  { path: "/finalise", label: "Finalise", icon: CheckCircle },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [role, setRole] = useState(() => localStorage.getItem("planner-role") || "Judge");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark") || localStorage.getItem("planner-theme") === "dark");
  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark", !dark);
    localStorage.setItem("planner-theme", dark ? "light" : "dark");
    setDark(!dark);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground flex-col md:flex-row font-serif">
      <aside className="w-full md:w-64 border-r border-border bg-sidebar shrink-0 font-sans flex flex-col">
        <div className="p-6 border-b border-sidebar-border flex items-center gap-3 text-sidebar-foreground">
          <Scale className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-serif font-bold text-lg leading-none tracking-tight">High Court</h1>
            <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase">Court Time Planner</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                <item.icon className="w-4 h-4 opacity-80" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border text-sm text-muted-foreground space-y-3">
          <div>Justice Sehgal's Chamber</div>
          <label className="block text-xs" htmlFor="role-switch">Viewing as</label>
          <select id="role-switch" value={role} onChange={e => { setRole(e.target.value); localStorage.setItem("planner-role", e.target.value); }} className="w-full bg-background border rounded-md p-2 text-foreground">
            <option>Judge</option><option>Court Master</option>
          </select>
          <button type="button" onClick={toggleTheme} className="flex items-center gap-2 rounded-md border px-3 py-2 w-full text-foreground hover:bg-sidebar-accent" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {dark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto overflow-auto font-sans">
          {children}
        </div>
      </main>
    </div>
  );
}