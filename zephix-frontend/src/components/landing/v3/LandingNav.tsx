import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Platform",
    placeholder: "Overview, engines, security",
  },
  {
    label: "Solutions",
    placeholder: "Portfolio, IT, programs",
  },
  {
    label: "Resources",
    placeholder: "Docs, guides",
  },
  {
    label: "Pricing",
    placeholder: "Plans & packaging",
  },
] as const;

function NavDropdown({
  label,
  placeholder,
}: {
  label: string;
  placeholder: string;
}): ReactElement {
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
        aria-expanded="false"
        aria-haspopup="true"
      >
        {label}
        <span className="text-slate-400" aria-hidden>
          ▾
        </span>
      </button>
      <div
        className="pointer-events-none invisible absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-slate-200 bg-white p-3 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100"
        role="menu"
        aria-hidden
      >
        <p className="text-xs text-slate-500">{placeholder}</p>
      </div>
    </div>
  );
}

export function LandingNav(): ReactElement {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b border-slate-200/80",
        scrolled ? "bg-white/95 backdrop-blur-sm" : "bg-white",
      ].join(" ")}
    >
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <Link
          to="/"
          className="flex items-center gap-2.5"
          aria-label="Zephix home"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white"
            aria-hidden
          >
            Z
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">Zephix</span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_GROUPS.map((g) => (
            <NavDropdown key={g.label} label={g.label} placeholder={g.placeholder} />
          ))}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            to="/login"
            className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Log in
          </Link>
          <Link
            to="/contact"
            data-cta="contact-sales"
            data-nav="v3"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Contact Sales
          </Link>
          <Link
            to="/demo"
            data-cta="demo-request"
            data-nav="v3"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Request Demo
          </Link>
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </nav>

      {open ? (
        <div
          id="landing-mobile-nav"
          className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden"
        >
          <div className="flex flex-col gap-3">
            {NAV_GROUPS.map((g) => (
              <span key={g.label} className="text-sm font-medium text-slate-800">
                {g.label}
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  {g.placeholder}
                </span>
              </span>
            ))}
            <Link
              to="/login"
              className="pt-2 text-sm font-medium text-slate-700"
              onClick={() => setOpen(false)}
            >
              Log in
            </Link>
            <Link
              to="/contact"
              data-cta="contact-sales"
              data-nav="v3"
              className="text-sm font-semibold text-slate-800"
              onClick={() => setOpen(false)}
            >
              Contact Sales
            </Link>
            <Link
              to="/demo"
              data-cta="demo-request"
              data-nav="v3"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Request Demo
            </Link>
            <Link
              to="/signup"
              className="rounded-lg border border-slate-300 py-2.5 text-center text-sm font-semibold text-slate-800"
              onClick={() => setOpen(false)}
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
