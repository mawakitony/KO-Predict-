"use client";

import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  removeAvatarAction,
  updateProfileAction,
  uploadAvatarAction,
  type ProfileActionState,
} from "@/lib/auth/profile-actions";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { roleKey } from "@/lib/i18n/labels";
import type { MessageKey } from "@/lib/i18n/translate";
import { resolveDisplayName } from "@/lib/profile/display";
import type { UserRole } from "@/types/student";

interface ProfileEditorProps {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

const initial: ProfileActionState = { ok: false };

const PROFILE_SUCCESS_KEYS: Record<string, MessageKey> = {
  "Profil mis à jour.": "admin.profile.updated",
  "Photo de profil mise à jour.": "admin.profile.photoUpdated",
  "Photo retirée.": "admin.profile.photoRemoved",
};

export function ProfileEditor({
  email,
  firstName,
  lastName,
  displayName,
  avatarUrl,
  role,
}: ProfileEditorProps) {
  const { t } = useLanguage();
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    initial,
  );
  const [avatarState, avatarAction, avatarPending] = useActionState(
    uploadAvatarAction,
    initial,
  );
  const [removeState, setRemoveState] = useState<ProfileActionState | null>(
    null,
  );
  const [removing, startRemove] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [liveFirstName, setLiveFirstName] = useState(firstName);
  const [liveLastName, setLiveLastName] = useState(lastName);
  const [liveDisplayName, setLiveDisplayName] = useState(displayName);
  const [liveAvatarUrl, setLiveAvatarUrl] = useState(avatarUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const lastToast = useRef<string | null>(null);

  useEffect(() => {
    setLiveFirstName(firstName);
    setLiveLastName(lastName);
    setLiveDisplayName(displayName);
    setLiveAvatarUrl(avatarUrl);
  }, [firstName, lastName, displayName, avatarUrl]);

  const shownAvatar = preview ?? liveAvatarUrl;
  const shownName = resolveDisplayName({
    displayName: liveDisplayName,
    firstName: liveFirstName,
    lastName: liveLastName,
    email,
  });
  const roleLabel = t(roleKey(role));
  function successText(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const key = PROFILE_SUCCESS_KEYS[raw];
    return key ? t(key) : raw;
  }

  useEffect(() => {
    if (profileState.ok) {
      if (profileState.firstName !== undefined) {
        setLiveFirstName(profileState.firstName);
      }
      if (profileState.lastName !== undefined) {
        setLiveLastName(profileState.lastName);
      }
      if (profileState.displayName !== undefined) {
        setLiveDisplayName(profileState.displayName);
      }
    }
    if (avatarState.ok && avatarState.avatarUrl !== undefined) {
      setLiveAvatarUrl(avatarState.avatarUrl);
      setPreview(null);
    }
  }, [profileState, avatarState]);

  useEffect(() => {
    const toast =
      (avatarState.ok && avatarState.message) ||
      (profileState.ok && profileState.message) ||
      (removeState?.ok && removeState.message) ||
      null;
    if (!toast || toast === lastToast.current) return;
    lastToast.current = toast;
    router.refresh();
  }, [
    avatarState.ok,
    avatarState.message,
    profileState.ok,
    profileState.message,
    removeState,
    router,
  ]);

  return (
    <div className="ko-profile-shell">
      <section className="ko-profile-identity" aria-labelledby="photo-title">
        <div className="ko-profile-identity-glow" aria-hidden />

        <div className="ko-profile-identity-grid">
          <div className="ko-profile-avatar-wrap">
            <div className="ko-profile-avatar-ring">
              <UserAvatar
                displayName={liveDisplayName}
                firstName={liveFirstName}
                lastName={liveLastName}
                email={email}
                imageUrl={shownAvatar}
                size="xl"
              />
            </div>
            <button
              type="button"
              className="ko-profile-camera"
              onClick={() => fileRef.current?.click()}
              disabled={avatarPending || removing}
              aria-label={t("admin.profile.changePhotoAria")}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </button>
          </div>

          <div className="ko-profile-identity-copy">
            <h2 id="photo-title" className="sr-only">
              {t("admin.profile.photoTitle")}
            </h2>
            <p className="ko-display ko-profile-identity-name">{shownName}</p>
            <span className="ko-profile-role-badge">{roleLabel}</span>
            <p className="ko-profile-hint">
              {t("admin.profile.photoHint")}
            </p>

            <form action={avatarAction} className="ko-profile-photo-actions">
              <input
                ref={fileRef}
                type="file"
                name="avatar"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                capture="user"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPreview(URL.createObjectURL(file));
                  e.currentTarget.form?.requestSubmit();
                }}
              />
              <button
                type="button"
                className="ko-profile-btn"
                onClick={() => fileRef.current?.click()}
                disabled={avatarPending || removing}
              >
                {avatarPending
                  ? t("common.sending")
                  : t("admin.profile.changePhoto")}
              </button>
              {liveAvatarUrl || preview ? (
                <button
                  type="button"
                  className="ko-profile-btn is-ghost"
                  disabled={removing || avatarPending}
                  onClick={() => {
                    startRemove(async () => {
                      const res = await removeAvatarAction();
                      setRemoveState(res);
                      if (res.ok) {
                        setPreview(null);
                        setLiveAvatarUrl(null);
                        router.refresh();
                      }
                    });
                  }}
                >
                  {removing ? t("admin.profile.removing") : t("admin.profile.remove")}
                </button>
              ) : null}
            </form>

            {avatarState.error || removeState?.error ? (
              <p className="mt-2 text-sm font-medium text-rose-600" role="alert">
                {avatarState.error ?? removeState?.error}
              </p>
            ) : null}
            {successText(avatarState.message ?? removeState?.message) ? (
              <p className="mt-2 text-sm font-medium text-teal-700">
                {successText(avatarState.message ?? removeState?.message)}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="ko-profile-card" aria-labelledby="info-title">
        <div className="ko-profile-card-head">
          <p className="ko-profile-section-kicker">{t("admin.profile.identity")}</p>
          <h2 id="info-title" className="ko-display ko-profile-section-title">
            {t("admin.profile.personal")}
          </h2>
          <p className="ko-profile-section-lead">
            {t("admin.profile.personalLead")}
          </p>
        </div>

        <form action={profileAction} className="ko-profile-form">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="ko-profile-field">
              <span>{t("admin.profile.firstName")}</span>
              <input
                name="firstName"
                defaultValue={liveFirstName ?? ""}
                maxLength={80}
                required
                placeholder={t("admin.profile.firstName")}
                autoComplete="given-name"
              />
            </label>
            <label className="ko-profile-field">
              <span>{t("admin.profile.lastName")}</span>
              <input
                name="lastName"
                defaultValue={liveLastName ?? ""}
                maxLength={80}
                placeholder={t("admin.profile.lastName")}
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="ko-profile-field">
            <span>{t("admin.profile.displayName")}</span>
            <input
              name="displayName"
              defaultValue={liveDisplayName ?? ""}
              maxLength={40}
              placeholder={t("admin.profile.displayNameHint")}
              autoComplete="nickname"
            />
          </label>

          <div className="ko-profile-locked-grid">
            <label className="ko-profile-field is-locked">
              <span>{t("common.email")}</span>
              <input value={email ?? ""} disabled readOnly />
              <em>{t("admin.profile.emailLocked")}</em>
            </label>

            <label className="ko-profile-field is-locked">
              <span>{t("admin.team.changeRole")}</span>
              <input value={roleLabel} disabled readOnly />
              <em>{t("admin.profile.roleLocked")}</em>
            </label>
          </div>

          {profileState.error ? (
            <p className="text-sm font-medium text-rose-600" role="alert">
              {profileState.error}
            </p>
          ) : null}
          {successText(profileState.message) ? (
            <p className="text-sm font-medium text-teal-700">
              {successText(profileState.message)}
            </p>
          ) : null}

          <div className="ko-profile-form-footer">
            <button
              type="submit"
              className="ko-profile-btn is-primary"
              disabled={profilePending}
            >
              {profilePending
                ? t("admin.profile.saving")
                : t("admin.profile.save")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
