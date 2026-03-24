import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Zap,
  Menu,
  X,
} from "lucide-react";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function StagingMarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);
  const methodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (productRef.current && !productRef.current.contains(t)) setProductOpen(false);
      if (methodRef.current && !methodRef.current.contains(t)) setMethodOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const navClass = `sticky top-0 z-50 border-b transition-colors ${
    scrolled
      ? "border-slate-200/80 bg-white/85 backdrop-blur-md shadow-sm"
      : "border-transparent bg-white/70 backdrop-blur-md"
  }`;

  return (
    <nav className={navClass} aria-label="Primary">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-8">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex shrink-0 items-center gap-2 text-left font-extrabold tracking-tight text-slate-900"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Zap className="h-5 w-5" aria-hidden />
          </span>
          <span>ZEPHIX</span>
        </button>

        <div className="hidden items-center gap-6 lg:flex">
          <div className="relative" ref={productRef}>
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-indigo-600"
              aria-expanded={productOpen}
              onClick={() => {
                setMethodOpen(false);
                setProductOpen((o) => !o);
              }}
            >
              Product
              <ChevronDown className="h-4 w-4" />
            </button>
            {productOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Architecture preview
                </p>
                <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-[10px] leading-tight text-slate-600">
                  Org → Workspaces → Cross-workspace visibility → Projects
                </div>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>
                    <button type="button" className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-50" onClick={() => { setProductOpen(false); scrollToId("platform"); }}>
                      Overview
                    </button>
                  </li>
                  <li>
                    <button type="button" className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-50" onClick={() => { setProductOpen(false); scrollToId("platform"); }}>
                      Workspaces
                    </button>
                  </li>
                  <li>
                    <button type="button" className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-50" onClick={() => { setProductOpen(false); scrollToId("resource-intelligence"); }}>
                      Resource Intelligence
                    </button>
                  </li>
                  <li>
                    <button type="button" className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-50" onClick={() => { setProductOpen(false); scrollToId("template-center"); }}>
                      Template Center
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="relative" ref={methodRef}>
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-indigo-600"
              aria-expanded={methodOpen}
              onClick={() => {
                setProductOpen(false);
                setMethodOpen((o) => !o);
              }}
            >
              Methodology
              <ChevronDown className="h-4 w-4" />
            </button>
            {methodOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <button type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setMethodOpen(false); scrollToId("template-center"); }}>
                  Agile
                </button>
                <button type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setMethodOpen(false); scrollToId("template-center"); }}>
                  Waterfall / Phase-gate
                </button>
                <button type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setMethodOpen(false); scrollToId("template-center"); }}>
                  Hybrid
                </button>
              </div>
            )}
          </div>

          <button type="button" className="text-sm font-medium text-slate-700 hover:text-indigo-600" onClick={() => scrollToId("use-cases")}>
            Use Cases
          </button>
          <button type="button" className="text-sm font-medium text-slate-700 hover:text-indigo-600" onClick={() => scrollToId("roadmap")}>
            Roadmap
          </button>
          <button type="button" className="text-sm font-medium text-slate-700 hover:text-indigo-600" onClick={() => scrollToId("pricing")}>
            Pricing
          </button>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Sign In
          </Link>
          <button
            type="button"
            onClick={() => scrollToId("waitlist")}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Join Q2 Beta Waitlist
          </button>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-700 lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-8 py-4 lg:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium text-slate-800">
            <button type="button" className="text-left" onClick={() => { scrollToId("platform"); setMobileOpen(false); }}>Product overview</button>
            <button type="button" className="text-left" onClick={() => { scrollToId("use-cases"); setMobileOpen(false); }}>Use cases</button>
            <button type="button" className="text-left" onClick={() => { scrollToId("template-center"); setMobileOpen(false); }}>Template Center</button>
            <button type="button" className="text-left" onClick={() => { scrollToId("roadmap"); setMobileOpen(false); }}>Roadmap</button>
            <button type="button" className="text-left" onClick={() => { scrollToId("pricing"); setMobileOpen(false); }}>Pricing</button>
            <Link to="/login" className="text-left" onClick={() => setMobileOpen(false)}>Sign In</Link>
            <button type="button" className="text-left text-indigo-600" onClick={() => { scrollToId("waitlist"); setMobileOpen(false); }}>Join Q2 Beta Waitlist</button>
          </div>
        </div>
      )}
    </nav>
  );
}
