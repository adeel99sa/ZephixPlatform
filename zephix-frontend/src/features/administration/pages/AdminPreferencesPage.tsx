import { useEffect, useMemo, useRef, type ReactElement, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { SettingsToggle } from "@/features/administration/components/SettingsToggle";
import { request } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

const prefsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  timezone: z.string().min(1),
  timezoneAuto: z.boolean(),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
  numberFormat: z.enum(["default", "en_US", "eu"]),
  language: z.literal("en"),
  weekStartsOn: z.enum(["sunday", "monday"]),
  timeFormat: z.enum(["12h", "24h"]),
});

type PrefsForm = z.infer<typeof prefsSchema>;

type PrefsApi = {
  theme: string;
  timezone?: string;
  timezoneAuto?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  language?: string;
  weekStartsOn?: string;
  timeFormat?: string;
};

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function supportedTimeZones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (typeof fn === "function") {
      return fn.call(Intl, "timeZone");
    }
  } catch {
    /* ignore */
  }
  return ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Singapore"];
}

function PrefRow({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-gray-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      <div className="shrink-0 sm:w-56 sm:max-w-[14rem] sm:text-right">{children}</div>
    </div>
  );
}

export default function AdminPreferencesPage(): ReactElement {
  const queryClient = useQueryClient();
  const timezones = useMemo(() => supportedTimeZones().slice().sort(), []);

  const prefsQuery = useQuery({
    queryKey: ["users", "me-preferences"],
    queryFn: () => request.get<PrefsApi>("/users/me/preferences"),
  });

  const form = useForm<PrefsForm>({
    resolver: zodResolver(prefsSchema),
    defaultValues: {
      theme: "light",
      timezone: "UTC",
      timezoneAuto: true,
      dateFormat: "YYYY-MM-DD",
      numberFormat: "default",
      language: "en",
      weekStartsOn: "monday",
      timeFormat: "24h",
    },
  });

  const timezoneAuto = useWatch({ control: form.control, name: "timezoneAuto" });
  const watchedForm = useWatch({ control: form.control });
  const formValuesJson = JSON.stringify(watchedForm);
  const skipAutosaveRef = useRef(true);

  useEffect(() => {
    if (!prefsQuery.data) return;
    const d = prefsQuery.data;
    const tzAuto = d.timezoneAuto !== false;
    form.reset({
      theme: (d.theme as PrefsForm["theme"]) || "light",
      timezone: d.timezone || browserTimeZone(),
      timezoneAuto: tzAuto,
      dateFormat: (d.dateFormat as PrefsForm["dateFormat"]) || "YYYY-MM-DD",
      numberFormat: (d.numberFormat as PrefsForm["numberFormat"]) || "default",
      language: "en",
      weekStartsOn: (d.weekStartsOn as PrefsForm["weekStartsOn"]) || "monday",
      timeFormat: (d.timeFormat as PrefsForm["timeFormat"]) || "24h",
    });
    skipAutosaveRef.current = true;
    queueMicrotask(() => {
      skipAutosaveRef.current = false;
    });
  }, [prefsQuery.data, form]);

  useEffect(() => {
    if (!timezoneAuto) return;
    const z = browserTimeZone();
    const current = form.getValues("timezone");
    if (current !== z) {
      form.setValue("timezone", z, { shouldDirty: false });
    }
  }, [timezoneAuto, form]);

  const save = useMutation({
    mutationFn: (body: PrefsForm) => {
      const payload = {
        theme: body.theme,
        timezone: body.timezone,
        timezoneAuto: body.timezoneAuto,
        dateFormat: body.dateFormat,
        numberFormat: body.numberFormat,
        language: body.language,
        weekStartsOn: body.weekStartsOn,
        timeFormat: body.timeFormat,
      };
      return request.patch<PrefsApi>("/users/me/preferences", payload);
    },
    onSuccess: (_data, variables) => {
      useUIStore.getState().setTheme(variables.theme);
      form.reset(variables);
      void queryClient.invalidateQueries({ queryKey: ["users", "me-preferences"] });
    },
    onError: () => toast.error("Could not save preferences"),
  });

  useEffect(() => {
    // Allow autosave after successful load OR after a recoverable load error (defaults + user edits).
    if (prefsQuery.isLoading || (!prefsQuery.isSuccess && !prefsQuery.isError) || skipAutosaveRef.current) return;
    if (!form.formState.isDirty) return;
    const t = window.setTimeout(() => {
      if (save.isPending) return;
      void form.handleSubmit((values) => save.mutate(values))();
    }, 550);
    return () => window.clearTimeout(t);
  }, [formValuesJson, form.formState.isDirty, prefsQuery.isSuccess, prefsQuery.isError, prefsQuery.isLoading, form, save]);

  const selectClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:ml-auto sm:max-w-[14rem]";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Preferences</h1>
        <p className="mt-1 text-sm text-gray-600">
          Choose how you want Zephix to look and behave. Changes save automatically.
        </p>
        {save.isPending ? (
          <p className="mt-1 text-xs font-medium text-neutral-500" aria-live="polite">
            Saving…
          </p>
        ) : null}
      </header>

      {prefsQuery.isLoading && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading…</div>
      )}
      {prefsQuery.isError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Saved preferences could not be loaded.</p>
          <p className="mt-1 text-amber-900/90">
            On a <strong>fresh local database</strong>, ensure the <code className="rounded bg-amber-100/80 px-1">user_settings</code> table
            exists: run backend migrations, or apply{" "}
            <code className="rounded bg-amber-100/80 px-1">zephix-backend/scripts/sql/ensure-user-settings-table.sql</code>{" "}
            with <code className="rounded bg-amber-100/80 px-1">psql</code>. You can still edit below; saving creates a row once the table exists.
          </p>
          <p className="mt-2 text-amber-900/80">If this persists on staging/production, sign out and back in, or contact support.</p>
        </div>
      )}

      {(prefsQuery.isSuccess || prefsQuery.isError) && !prefsQuery.isLoading && (
        <form
          className="space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <section className="rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm sm:px-6">
            <h2 className="border-b border-gray-100 px-0 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Appearance
            </h2>
            <PrefRow
              title="Theme"
              description="Choose a theme for Zephix on this device."
            >
              <select className={selectClass} {...form.register("theme")}>
                <option value="system">Use system setting</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </PrefRow>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm sm:px-6">
            <h2 className="border-b border-gray-100 px-0 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Language &amp; region
            </h2>
            <PrefRow
              title="Language"
              description="Choose the language you want to use Zephix in."
            >
              <select className={cn(selectClass, "text-gray-500")} disabled {...form.register("language")}>
                <option value="en">English</option>
              </select>
            </PrefRow>
            <PrefRow
              title="Number format"
              description="Choose how numbers and currencies are formatted. Default follows your locale when we apply it across the app."
            >
              <select className={selectClass} {...form.register("numberFormat")}>
                <option value="default">Default</option>
                <option value="en_US">1,000,000.00</option>
                <option value="eu">1.000.000,00</option>
              </select>
            </PrefRow>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm sm:px-6">
            <h2 className="border-b border-gray-100 px-0 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Time &amp; date
            </h2>
            <PrefRow
              title="Start week on Monday"
              description="When enabled, calendars and week-based views treat Monday as the first day of the week."
            >
              <div className="flex justify-end">
                <SettingsToggle
                  id="week-mon"
                  checked={form.watch("weekStartsOn") === "monday"}
                  onCheckedChange={(on) =>
                    form.setValue("weekStartsOn", on ? "monday" : "sunday", {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                  aria-label="Start week on Monday"
                />
              </div>
            </PrefRow>
            <PrefRow
              title="Date format"
              description="Default format for dates in lists and forms (full rollout will use this everywhere)."
            >
              <select className={selectClass} {...form.register("dateFormat")}>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </PrefRow>
            <PrefRow
              title="Time format"
              description="12-hour or 24-hour clock."
            >
              <select className={selectClass} {...form.register("timeFormat")}>
                <option value="24h">24-hour</option>
                <option value="12h">12-hour</option>
              </select>
            </PrefRow>
            <PrefRow
              title="Set time zone automatically using your location"
              description="Uses your browser’s reported time zone. Reminders and emails will align to this when those features use it."
            >
              <div className="flex justify-end">
                <SettingsToggle
                  id="tz-auto"
                  checked={!!form.watch("timezoneAuto")}
                  onCheckedChange={(on) => {
                    form.setValue("timezoneAuto", on, { shouldDirty: true, shouldTouch: true });
                    if (on) {
                      form.setValue("timezone", browserTimeZone(), { shouldDirty: true });
                    }
                  }}
                  aria-label="Set time zone automatically"
                />
              </div>
            </PrefRow>
            <PrefRow
              title="Time zone"
              description={
                timezoneAuto
                  ? "Managed automatically. Turn off the option above to choose manually."
                  : "Choose your time zone."
              }
            >
              <select
                className={cn(selectClass, timezoneAuto && "cursor-not-allowed bg-gray-50 text-gray-500")}
                disabled={timezoneAuto}
                {...form.register("timezone")}
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </PrefRow>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Navigation</h2>
            <p className="text-sm text-gray-600">
              Zephix remembers where you left off: your <strong>last visited page</strong> in each area is restored when
              you return—no extra setting required.
            </p>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Privacy &amp; data</h2>
            <p className="text-sm text-gray-600">
              For most teams the highest-priority controls are:{" "}
              <strong>cookie / tracking consent</strong> (legal requirement in many regions),{" "}
              <strong>marketing and email opt-outs</strong> (CAN-SPAM, GDPR), and{" "}
              <strong>who can discover or invite you</strong> (workspace safety). Fine-grained toggles will appear here as
              the product matures; for now use your organization’s policies and{" "}
              <Link className="font-medium text-indigo-600 hover:text-indigo-500" to="/administration/notifications">
                notification settings
              </Link>{" "}
              for email categories.
            </p>
            <p className="mt-3 text-sm">
              <a
                className="font-medium text-indigo-600 hover:text-indigo-500"
                href="https://getzephix.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy policy (site)
              </a>
            </p>
          </section>

        </form>
      )}
    </div>
  );
}
