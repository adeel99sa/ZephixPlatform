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
});

type PrefsForm = z.infer<typeof prefsSchema>;

type PrefsApi = {
  theme: string;
  timezone?: string;
  dateFormat?: string;
  defaultView?: string;
  language?: string;
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
    },
  });

  useEffect(() => {
    if (!prefsQuery.data) return;
    form.reset({
      theme: (prefsQuery.data.theme as PrefsForm["theme"]) || "light",
      timezone: prefsQuery.data.timezone || "UTC",
      dateFormat: (prefsQuery.data.dateFormat as PrefsForm["dateFormat"]) || "YYYY-MM-DD",
      defaultView: (prefsQuery.data.defaultView as PrefsForm["defaultView"]) || "waterfall",
      language: (prefsQuery.data.language as PrefsForm["language"]) || "en",
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
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Preferences</h1>
        <p className="mt-1 text-sm text-gray-600">Theme, locale, and default views.</p>
      </header>

      {prefsQuery.isLoading && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading…</div>
      )}
      {prefsQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load preferences. You may need an organization context on your account.
        </div>
      )}

      {prefsQuery.data && (
        <form
          className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          onSubmit={form.handleSubmit((values) => save.mutate(values))}
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Theme</h2>
            <p className="text-sm text-gray-500">Choose how Zephix looks on this device.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(
                [
                  { id: "light", label: "Light" },
                  { id: "dark", label: "Dark" },
                  { id: "system", label: "System" },
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
            {form.formState.errors.theme && (
              <p className="mt-2 text-xs text-red-600">{form.formState.errors.theme.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="defaultView">
                Default view
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
          </div>

          <div>
            <button
              type="submit"
              disabled={save.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
