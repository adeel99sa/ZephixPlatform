import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { request } from "@/lib/api";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
});

type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

type AccountProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePicture: string | null;
  platformRole: string;
  isEmailVerified: boolean;
  createdAt: string;
};

export default function AdminProfilePage() {
  const queryClient = useQueryClient();

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
  }, [profileQuery.data, profileForm]);

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfile = useMutation({
    mutationFn: (body: ProfileForm) => request.patch<AccountProfile>("/auth/profile", body),
    onSuccess: () => {
      toast.success("Profile updated");
      void queryClient.invalidateQueries({ queryKey: ["auth", "account-profile"] });
    },
    onError: () => {
      toast.error("Could not update profile");
    },
  });

  const changePassword = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      request.post("/auth/change-password", body),
    onSuccess: () => {
      toast.success("Password updated");
      passwordForm.reset();
    },
    onError: () => {
      toast.error("Could not change password");
    },
  });

  const p = profileQuery.data;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-600">Your name and sign-in security.</p>
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
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{p.email}</p>
                <p className="text-xs text-gray-500">Email cannot be changed here.</p>
                <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                  {p.platformRole}
                </span>
              </div>
            </div>

            <form
              className="mt-6 grid gap-4 md:grid-cols-2"
              onSubmit={profileForm.handleSubmit((values) => updateProfile.mutate(values))}
            >
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
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {updateProfile.isPending ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Password</h2>
            <p className="mt-1 text-sm text-gray-500">Use a strong password you do not reuse elsewhere.</p>

            <form
              className="mt-6 grid max-w-xl gap-4"
              onSubmit={passwordForm.handleSubmit((values) =>
                changePassword.mutate({
                  currentPassword: values.currentPassword,
                  newPassword: values.newPassword,
                }),
              )}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="currentPassword">
                  Current password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...passwordForm.register("currentPassword")}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="newPassword">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...passwordForm.register("newPassword")}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="confirmPassword">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  {...passwordForm.register("confirmPassword")}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <div>
                <button
                  type="submit"
                  disabled={changePassword.isPending}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {changePassword.isPending ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
