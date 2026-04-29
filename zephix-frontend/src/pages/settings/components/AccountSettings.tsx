import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { track } from "@/lib/telemetry";
import { useAuth } from "@/state/AuthContext";
import { apiClient } from "@/lib/api/client";
import { getAxiosErrorMessage } from "../settingsErrors";

const PASSWORD_MIN = 8;

type ProfilePayload = {
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
};

export function AccountSettings() {
  const { user, refreshMe } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [emailDisplay, setEmailDisplay] = useState("");

  const initialProfile = useRef<ProfilePayload | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const hydrateFromServer = useCallback(async () => {
    try {
      const data = await apiClient.get<{
        firstName?: string | null;
        lastName?: string | null;
        profilePicture?: string | null;
        email?: string;
      }>("/auth/profile");
      const fn = data.firstName ?? "";
      const ln = data.lastName ?? "";
      const pic = data.profilePicture ?? "";
      const em = data.email ?? user?.email ?? "";
      setFirstName(fn);
      setLastName(ln);
      setProfilePictureUrl(pic);
      setEmailDisplay(em);
      initialProfile.current = {
        firstName: fn,
        lastName: ln,
        profilePicture: pic,
      };
    } catch {
      const fn = user?.firstName ?? "";
      const ln = user?.lastName ?? "";
      const pic = user?.profilePicture ?? "";
      setFirstName(fn);
      setLastName(ln);
      setProfilePictureUrl(pic);
      setEmailDisplay(user?.email ?? "");
      initialProfile.current = {
        firstName: fn,
        lastName: ln,
        profilePicture: pic,
      };
    }
  }, [user?.email, user?.firstName, user?.lastName, user?.profilePicture]);

  useEffect(() => {
    void hydrateFromServer();
  }, [hydrateFromServer]);

  const handleSaveProfile = async () => {
    setProfileError(null);
    const fn = firstName.trim();
    const ln = lastName.trim();
    const pic = profilePictureUrl.trim();

    if (!fn || fn.length > 100 || !ln || ln.length > 100) {
      setProfileError("First and last name are required (max 100 characters each).");
      return;
    }
    if (pic.length > 500) {
      setProfileError("Profile picture URL must be at most 500 characters.");
      return;
    }

    const base = initialProfile.current;
    const payload: ProfilePayload = {};
    if (!base || fn !== (base.firstName ?? "").trim()) payload.firstName = fn;
    if (!base || ln !== (base.lastName ?? "").trim()) payload.lastName = ln;
    if (!base || pic !== (base.profilePicture ?? "").trim()) {
      payload.profilePicture = pic || undefined;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No profile changes to save.");
      return;
    }

    setSavingProfile(true);
    track("settings.account.profile_save_attempt", {});
    try {
      await apiClient.patch("/auth/profile", payload);
      toast.success("Profile saved.");
      initialProfile.current = {
        firstName: fn,
        lastName: ln,
        profilePicture: pic,
      };
      try {
        await refreshMe();
      } catch {
        toast.warning("Profile saved, but refreshing your session failed. Reload the page if something looks stale.");
      }
    } catch (e) {
      setProfileError(getAxiosErrorMessage(e, "Could not save profile."));
      toast.error(getAxiosErrorMessage(e, "Could not save profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Fill in current password, new password, and confirmation.");
      return;
    }
    if (newPassword.length < PASSWORD_MIN) {
      setPasswordError(`New password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from your current password.");
      return;
    }

    setSavingPassword(true);
    track("settings.account.password_change_attempt", {});
    try {
      await apiClient.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      const msg = getAxiosErrorMessage(e, "Could not change password.");
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="settings-account">
      {/* Profile */}
      <section className="space-y-3">
        <h2 className="font-medium">Account profile</h2>
        <div className="grid gap-2 max-w-lg">
          <label className="grid">
            <span>First name</span>
            <input
              data-testid="settings-account-first-name"
              className="input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </label>
          <label className="grid">
            <span>Last name</span>
            <input
              data-testid="settings-account-last-name"
              className="input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </label>
          <label className="grid">
            <span>Email</span>
            <input
              data-testid="settings-account-email"
              className="input bg-slate-50 text-slate-600"
              value={emailDisplay}
              readOnly
              aria-readonly="true"
            />
          </label>
          <p className="text-xs text-slate-500">
            Email cannot be changed here. Contact support if you need to update it.
          </p>
          <label className="grid">
            <span>Profile picture URL</span>
            <input
              data-testid="settings-account-profile-picture-url"
              className="input"
              value={profilePictureUrl}
              onChange={(e) => setProfilePictureUrl(e.target.value)}
              placeholder="https://..."
              autoComplete="off"
            />
          </label>
        </div>
        {profileError && (
          <p className="text-sm text-red-600" role="alert">
            {profileError}
          </p>
        )}
        <button
          type="button"
          data-testid="settings-account-save-profile"
          onClick={() => void handleSaveProfile()}
          disabled={savingProfile}
          className="btn-primary inline-flex items-center gap-2"
        >
          {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
          Save profile
        </button>
      </section>

      {/* Password */}
      <section className="space-y-3 border-t border-slate-200 pt-8">
        <h2 className="font-medium">Change password</h2>
        <div className="grid gap-2 max-w-lg">
          <label className="grid">
            <span>Current password</span>
            <input
              type="password"
              data-testid="settings-account-current-password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="grid">
            <span>New password</span>
            <input
              type="password"
              data-testid="settings-account-new-password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="grid">
            <span>Confirm new password</span>
            <input
              type="password"
              data-testid="settings-account-confirm-password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        </div>
        {passwordError && (
          <p className="text-sm text-red-600" role="alert">
            {passwordError}
          </p>
        )}
        <button
          type="button"
          data-testid="settings-account-save-password"
          onClick={() => void handleChangePassword()}
          disabled={savingPassword}
          className="btn-primary inline-flex items-center gap-2"
        >
          {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </button>
      </section>
    </div>
  );
}
