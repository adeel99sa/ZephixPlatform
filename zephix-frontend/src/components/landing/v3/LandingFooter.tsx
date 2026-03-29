import type { ReactElement } from "react";
import { Link } from "react-router-dom";

const COLS = [
  {
    title: "Platform",
    links: [
      { label: "Governance Engine", href: "#engines" },
      { label: "Capacity", href: "#engines" },
      { label: "Resource", href: "#engines" },
      { label: "Risk", href: "#engines" },
      { label: "AI", href: "#engines" },
      { label: "Security", href: "#architecture" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Programs & portfolios", href: "#engines" },
      { label: "IT Teams", href: "#engines" },
      { label: "Marketing", href: "#engines" },
      { label: "Agile", href: "#engines" },
      { label: "Waterfall", href: "#engines" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "#architecture" },
      { label: "API", href: "#architecture" },
      { label: "Templates", href: "#engines" },
      { label: "Webinars", href: "#roadmap" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#architecture" },
      { label: "Careers", href: "#roadmap" },
      { label: "Contact", href: "/contact" },
      {
        label: "Privacy",
        href: "/demo?intent=privacy-inquiry",
      },
      {
        label: "Terms",
        href: "/demo?intent=terms-inquiry",
      },
    ],
  },
] as const;

function FooterLink({
  href,
  label,
}: {
  href: string;
  label: string;
}): ReactElement {
  const external = href.startsWith("mailto:");
  const internal = href.startsWith("/");
  if (internal && !external) {
    return (
      <Link to={href} className="text-sm text-slate-600 hover:text-slate-900">
        {label}
      </Link>
    );
  }
  return (
    <a href={href} className="text-sm text-slate-600 hover:text-slate-900">
      {label}
    </a>
  );
}

/** When true, in-page hash links point at the main marketing homepage (`/#section`). */
export function LandingFooter({
  homeHashLinks = false,
}: {
  homeHashLinks?: boolean;
} = {}): ReactElement {
  const resolveHref = (href: string) =>
    homeHashLinks && href.startsWith("#") ? `/${href}` : href;

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <FooterLink href={resolveHref(l.href)} label={l.label} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-slate-700 pt-8 text-center text-xs text-slate-500">
          Copyright © 2026 Zephix
        </div>
      </div>
    </footer>
  );
}
