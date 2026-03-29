import type { FormEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/v3/LandingFooter";
import { RESOURCE_RISK_CAMPAIGN_SLUG } from "@/components/landing/campaign/resource-risk-constants";
import { apiClient } from "@/lib/api/client";

type PageCopy = { kicker: string; title: string; blurb: string };

const PAGE_BY_INTENT: Record<string, PageCopy> = {
  "": {
    kicker: "Request a demo",
    title: "Talk to our team",
    blurb:
      "Submit a few details. Your request is tracked server-side — we will follow up within one business day.",
  },
  contact: {
    kicker: "Contact sales",
    title: "We will get back to you",
    blurb: "Tell us what you need. We route this to the right person and respond within one business day.",
  },
  "privacy-inquiry": {
    kicker: "Privacy",
    title: "Privacy inquiry",
    blurb: "Submit a privacy-related question. We will respond using the work email you provide below.",
  },
  "terms-inquiry": {
    kicker: "Terms",
    title: "Terms inquiry",
    blurb: "Submit a terms-related question. We will respond using the work email you provide below.",
  },
  billing: {
    kicker: "Billing",
    title: "Billing and plans",
    blurb: "Questions about your plan or invoice — we will route this to the right team.",
  },
};

export default function DemoRequestPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const campaign = searchParams.get("campaign") ?? "";
  const intent = searchParams.get("intent") ?? "";
  const page = PAGE_BY_INTENT[intent] ?? PAGE_BY_INTENT[""];

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [useCase, setUseCase] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    void apiClient.get("auth/csrf").catch(() => {
      /* best-effort: cookie set for mutating POST */
    });
  }, []);

  useEffect(() => {
    if (submitted) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [submitted]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/demo-requests", {
        companyName,
        contactName,
        email,
        phone: phone || undefined,
        companySize: companySize || undefined,
        useCase,
        preferredDate: preferredDate || undefined,
        campaignSlug: campaign || undefined,
        leadIntent: intent || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-white font-sans text-slate-900 antialiased"
      data-page="demo-request"
      data-campaign={campaign || undefined}
      data-intent={intent || undefined}
    >
      <LandingNavbar />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        {submitted ? (
          <div
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/90 px-5 py-8 text-center shadow-sm"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-demo-state="success"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-700" aria-hidden />
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-emerald-950">
              You are all set
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-emerald-900/95">
              Your request was received. We have recorded your details and will follow up — nothing
              else is required from you right now.
            </p>
            <p className="mt-4 text-sm font-medium text-emerald-950">
              Confirmation: we will use{" "}
              <span className="break-all rounded bg-white/80 px-1.5 py-0.5 font-semibold text-emerald-950 ring-1 ring-emerald-200/80">
                {email}
              </span>{" "}
              to respond.
            </p>
            <p className="mt-3 text-sm text-emerald-900/90">
              Typical response time: within one business day (often sooner).
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                data-cta="demo-success-home"
              >
                Back to home
              </Link>
              {campaign === RESOURCE_RISK_CAMPAIGN_SLUG ? (
                <Link
                  to="/campaign/resource-risk"
                  className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-colors hover:bg-emerald-100/50"
                  data-cta="demo-success-campaign"
                  data-campaign={RESOURCE_RISK_CAMPAIGN_SLUG}
                >
                  Back to campaign
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-indigo-700">{page.kicker}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{page.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{page.blurb}</p>

            <form
              onSubmit={handleSubmit}
              className="mt-10 space-y-5"
              data-form="demo-request"
              data-campaign={campaign || undefined}
            >
              <input type="hidden" name="campaignSlug" value={campaign} readOnly aria-hidden />
              <input type="hidden" name="leadIntent" value={intent} readOnly aria-hidden />

              {error ? (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              ) : null}

              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">
                  Company name *
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoComplete="organization"
                />
              </div>
              <div>
                <label htmlFor="contactName" className="block text-sm font-medium text-slate-700">
                  Your name *
                </label>
                <input
                  id="contactName"
                  name="contactName"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Work email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                  Phone (optional)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label htmlFor="companySize" className="block text-sm font-medium text-slate-700">
                  Company size (optional)
                </label>
                <select
                  id="companySize"
                  name="companySize"
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select…</option>
                  <option value="1-10">1–10</option>
                  <option value="11-50">11–50</option>
                  <option value="51-200">51–200</option>
                  <option value="201-1000">201–1000</option>
                  <option value="1000+">1000+</option>
                </select>
              </div>
              <div>
                <label htmlFor="useCase" className="block text-sm font-medium text-slate-700">
                  What should we cover? *
                </label>
                <textarea
                  id="useCase"
                  name="useCase"
                  required
                  rows={4}
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Teams, programs, governance, integrations…"
                />
              </div>
              <div>
                <label htmlFor="preferredDate" className="block text-sm font-medium text-slate-700">
                  Preferred timing (optional)
                </label>
                <input
                  id="preferredDate"
                  name="preferredDate"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. next week, Q2"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                data-cta="demo_submit"
                data-campaign={campaign || undefined}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending…" : "Submit request"}
              </button>
            </form>
          </>
        )}
      </main>
      <LandingFooter homeHashLinks />
    </div>
  );
}
