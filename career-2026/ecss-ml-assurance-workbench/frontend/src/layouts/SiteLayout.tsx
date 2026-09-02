import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, Satellite, X } from "lucide-react";
import { profile } from "../content";
import { joinClassName } from "../utils/format";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/expertise", label: "Expertise" },
  { to: "/site-projects", label: "Projects" },
  { to: "/flagship", label: "Flagship" },
  { to: "/publications", label: "Publications" },
  { to: "/cv", label: "CV" },
  { to: "/workbench", label: "Workbench" },
  { to: "/contact", label: "Contact" },
];

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-accent-600 focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-base-900/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-100" aria-label="Home">
            <Satellite className="h-5 w-5 text-accent-400" />
            <span className="max-w-[46vw] truncate">{profile.professionalTitle}</span>
          </Link>
          <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  joinClassName(
                    "rounded px-2.5 py-1.5 text-sm",
                    isActive ? "bg-accent-600/15 text-accent-300" : "text-slate-300 hover:bg-base-800 hover:text-white",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            className="ml-auto rounded border border-slate-700 p-1.5 text-slate-300 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-label="Close navigation" />
            <nav aria-label="Mobile" className="absolute inset-y-0 right-0 w-72 overflow-y-auto border-l border-slate-800 bg-base-900 p-3">
              <div className="flex justify-end">
                <button onClick={() => setOpen(false)} aria-label="Close navigation" className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ul className="space-y-1">
                {NAV.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        joinClassName(
                          "block rounded px-3 py-2 text-sm",
                          isActive ? "bg-accent-600/15 text-accent-300" : "text-slate-200 hover:bg-base-800",
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        {profile.professionalTitle}. Engineering portfolio — synthetic demonstration projects. No ECSS
        certification is claimed. Profile configurable in <code>frontend/src/content/profile.json</code>.
      </footer>
    </div>
  );
}
