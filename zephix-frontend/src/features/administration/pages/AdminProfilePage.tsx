import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { request } from "@/lib/api";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
});

type ProfileForm = z.infer<typeof profileSchema>;

type AccountProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePicture: string | null;
  platformRole: string;
  organizationName?: string | null;
  isEmailVerified: boolean;
  createdAt: string;
};

export default function AdminProfilePage() {
  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const profileQuery = useQuery({
    queryKey: ["auth", "account-profile"],
    queryFn: () => request.get<AccountProfile>("/auth/profile"),
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "" },
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    profileForm.reset({
      firstName: profileQuery.data.firstName || "",
      lastName: profileQuery.data.lastName || "",
    });
    hydratedRef.current = true;
  }, [profileQuery.data, profileForm]);

  const updateProfile = useMutation({
    mutationFn: (body: ProfileForm) => request.patch<AccountProfile>("/auth/profile", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth", "account-profile"] });
    },
    onError: () => {
      toast.error("Could not update profile");
    },
  });

  const firstName = profileForm.watch("firstName");
  const lastName = profileForm.watch("lastName");

  useEffect(() => {
    if (!hydratedRef.current || !profileQuery.data) return;
    const sameAsServer =
      firstName === (profileQuery.data.firstName || "") && lastName === (profileQuery.data.lastName || "");
    if (sameAsServer) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const ok = await profileForm.trigger();
      if (!ok) return;
      updateProfile.mutate({ firstName, lastName });
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [firstName, lastName, profileQuery.data, profileForm, updateProfile]);

  const p = profileQuery.data;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Your name and account details. Changes save automatically.
        </p>
        {updateProfile.isPending ? (
          <p className="mt-1 text-xs font-medium text-neutral-500" aria-live="polite">
            Saving…
          </p>
        ) : null}
      </header>

      {profileQuery.isLoading && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading…</div>
      )}
      {profileQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load profile.
        </div>
      )}

      {p && (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Account</h2>
            <p className="mt-1 text-sm text-gray-500">Update how your name appears across Zephix.</p>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-blue-500 text-xl font-semibold text-white">
                {(p.firstName?.[0] || p.email?.[0] || "?").toUpperCase()}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                    {p.platformRole}
                  </span>
                </div>
                {p.organizationName ? (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">Organization:</span> {p.organizationName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-700">{p.email}</p>
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed here.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="firstName">
                  First name
                </label>
                <input
                  id="firstName"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...profileForm.register("firstName")}
                />
                {profileForm.formState.errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="lastName">
                  Last name
                </label>
                <input
                  id="lastName"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...profileForm.register("lastName")}
                />
                {profileForm.formState.errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Password</h2>
            <p className="mt-1 text-sm text-gray-500">
              Password changes are handled outside the app for this release. Use a password reset email when
              self-service reset is enabled, or contact your organization administrator.
            </p>
            <p className="mt-4 text-sm text-gray-700">
              If you are locked out or need an administrator to reset your password, contact support or your workspace
              owner.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
