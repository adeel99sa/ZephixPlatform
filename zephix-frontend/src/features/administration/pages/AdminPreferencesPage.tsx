import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { request } from "@/lib/api";

const prefsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  timezone: z.string().min(1),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
  defaultView: z.enum(["waterfall", "board", "table", "activities"]),
  language: z.enum(["en"]),
  highContrast: z.boolean(),
  notifyTimezoneChange: z.boolean(),
  weekStartsOn: z.enum(["sunday", "monday"]),
  timeFormat: z.enum(["12h", "24h"]),
  defaultTaskGrouping: z.enum(["none", "status", "assignee", "priority", "dueDate"]),
});

type PrefsForm = z.infer<typeof prefsSchema>;

type PrefsApi = {
  theme: string;
  timezone?: string;
  dateFormat?: string;
  defaultView?: string;
  language?: string;
  highContrast?: boolean;
  notifyTimezoneChange?: boolean;
  weekStartsOn?: string;
  timeFormat?: string;
  defaultTaskGrouping?: string;
};

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

export default function AdminPreferencesPage() {
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
      dateFormat: "YYYY-MM-DD",
      defaultView: "waterfall",
      language: "en",
      highContrast: false,
      notifyTimezoneChange: false,
      weekStartsOn: "monday",
      timeFormat: "24h",
      defaultTaskGrouping: "status",
    },
  });

  useEffect(() => {
    if (!prefsQuery.data) return;
    const d = prefsQuery.data;
    form.reset({
      theme: (d.theme as PrefsForm["theme"]) || "light",
      timezone: d.timezone || "UTC",
      dateFormat: (d.dateFormat as PrefsForm["dateFormat"]) || "YYYY-MM-DD",
      defaultView: (d.defaultView as PrefsForm["defaultView"]) || "waterfall",
      language: (d.language as PrefsForm["language"]) || "en",
      highContrast: !!d.highContrast,
      notifyTimezoneChange: !!d.notifyTimezoneChange,
      weekStartsOn: (d.weekStartsOn as PrefsForm["weekStartsOn"]) || "monday",
      timeFormat: (d.timeFormat as PrefsForm["timeFormat"]) || "24h",
      defaultTaskGrouping: (d.defaultTaskGrouping as PrefsForm["defaultTaskGrouping"]) || "status",
    });
  }, [prefsQuery.data, form]);

  const save = useMutation({
    mutationFn: (body: Partial<PrefsForm>) => request.patch<PrefsApi>("/users/me/preferences", body),
    onSuccess: () => {
      toast.success("Preferences saved");
      void queryClient.invalidateQueries({ queryKey: ["users", "me-preferences"] });
    },
    onError: () => toast.error("Could not save preferences"),
  });

  return (
    <div className="relative space-y-8 pb-28">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Preferences</h1>
        <p className="mt-1 text-sm text-gray-600">Appearance, locale, time formats, and default views.</p>
      </header>

      {prefsQuery.isLoading && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading…</div>
      )}
      {prefsQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load preferences. If this persists, sign out and back in, or contact support.
        </div>
      )}

      {prefsQuery.data && (
        <form
          className="space-y-10"
          onSubmit={form.handleSubmit((values) => save.mutate(values))}
        >
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
            <p className="mt-1 text-sm text-gray-500">How Zephix looks on this device.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(
                [
                  { id: "light", label: "Light" },
                  { id: "dark", label: "Dark" },
                  { id: "system", label: "Auto" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.id}
                  className={`cursor-pointer rounded-lg border px-4 py-3 text-sm font-medium shadow-sm ${
                    form.watch("theme") === opt.id
                      ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                      : "border-gray-200 bg-white text-gray-800 hover:border-gray-300"
                  }`}
                >
                  <input type="radio" className="sr-only" value={opt.id} {...form.register("theme")} />
                  {opt.label}
                </label>
              ))}
            </div>
            <label className="mt-6 flex items-center justify-between gap-4 rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <span className="text-sm font-medium text-gray-900">High contrast</span>
                <p className="text-xs text-gray-500">Increases contrast for readability.</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.watch("highContrast")}
                onChange={(e) =>
                  form.setValue("highContrast", e.target.checked, { shouldDirty: true, shouldTouch: true })
                }
              />
            </label>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Language &amp; region</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="language">
                  Language
                </label>
                <select
                  id="language"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...form.register("language")}
                >
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="timezone">
                  Timezone
                </label>
                <select
                  id="timezone"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...form.register("timezone")}
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="mt-4 flex items-center justify-between gap-4 rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
              <span className="text-sm font-medium text-gray-900">Notify me of timezone changes</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.watch("notifyTimezoneChange")}
                onChange={(e) =>
                  form.setValue("notifyTimezoneChange", e.target.checked, {
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
              />
            </label>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Time &amp; date format</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="weekStartsOn">
                  Start of week
                </label>
                <select
                  id="weekStartsOn"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...form.register("weekStartsOn")}
                >
                  <option value="sunday">Sunday</option>
                  <option value="monday">Monday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="timeFormat">
                  Time format
                </label>
                <select
                  id="timeFormat"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...form.register("timeFormat")}
                >
                  <option value="24h">24-hour</option>
                  <option value="12h">12-hour</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="dateFormat">
                  Date format
                </label>
                <select
                  id="dateFormat"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...form.register("dateFormat")}
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Default views</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="defaultView">
                  Default project view
                </label>
                <select
                  id="defaultView"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...form.register("defaultView")}
                >
                  <option value="waterfall">Waterfall</option>
                  <option value="board">Board</option>
                  <option value="table">Table</option>
                  <option value="activities">Activities</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="defaultTaskGrouping">
                  Default task grouping
                </label>
                <select
                  id="defaultTaskGrouping"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...form.register("defaultTaskGrouping")}
                >
                  <option value="none">None</option>
                  <option value="status">Status</option>
                  <option value="assignee">Assignee</option>
                  <option value="priority">Priority</option>
                  <option value="dueDate">Due date</option>
                </select>
              </div>
            </div>
          </section>

          <div className="pointer-events-none fixed bottom-6 right-6 z-20 flex justify-end sm:right-10">
            <button
              type="submit"
              disabled={save.isPending}
              className="pointer-events-auto rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
