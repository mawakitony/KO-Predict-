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
import { roleLabelFr } from "@/lib/auth/roles";
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

export function ProfileEditor({
  email,
  firstName,
  lastName,
  displayName,
  avatarUrl,
  role,
}: ProfileEditorProps) {
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
  const roleLabel = roleLabelFr(role);

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
              aria-label="Changer la photo de profil"
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
              Photo de profil
            </h2>
            <p className="ko-display ko-profile-identity-name">{shownName}</p>
            <span className="ko-profile-role-badge">{roleLabel}</span>
            <p className="ko-profile-hint">
              JPG, JPEG, PNG ou WebP · max 5 Mo
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
                {avatarPending ? "Envoi…" : "Changer la photo"}
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
                  {removing ? "Suppression…" : "Supprimer"}
                </button>
              ) : null}
            </form>

            {avatarState.error || removeState?.error ? (
              <p className="mt-2 text-sm font-medium text-rose-600" role="alert">
                {avatarState.error ?? removeState?.error}
              </p>
            ) : null}
            {avatarState.message || removeState?.message ? (
              <p className="mt-2 text-sm font-medium text-teal-700">
                {avatarState.message ?? removeState?.message}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="ko-profile-card" aria-labelledby="info-title">
        <div className="ko-profile-card-head">
          <p className="ko-profile-section-kicker">Identité</p>
          <h2 id="info-title" className="ko-display ko-profile-section-title">
            Informations personnelles
          </h2>
          <p className="ko-profile-section-lead">
            Ces informations apparaissent dans KO Predict™. Votre email et votre
            rôle restent gérés séparément.
          </p>
        </div>

        <form action={profileAction} className="ko-profile-form">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="ko-profile-field">
              <span>Prénom</span>
              <input
                name="firstName"
                defaultValue={liveFirstName ?? ""}
                maxLength={80}
                required
                placeholder="Prénom"
                autoComplete="given-name"
              />
            </label>
            <label className="ko-profile-field">
              <span>Nom</span>
              <input
                name="lastName"
                defaultValue={liveLastName ?? ""}
                maxLength={80}
                placeholder="Nom"
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="ko-profile-field">
            <span>Pseudo / nom d&apos;affichage</span>
            <input
              name="displayName"
              defaultValue={liveDisplayName ?? ""}
              maxLength={40}
              placeholder="Ex. Tony A."
              autoComplete="nickname"
            />
          </label>

          <div className="ko-profile-locked-grid">
            <label className="ko-profile-field is-locked">
              <span>Email</span>
              <input value={email ?? ""} disabled readOnly />
              <em>Non modifiable ici (vérification requise).</em>
            </label>

            <label className="ko-profile-field is-locked">
              <span>Rôle</span>
              <input value={roleLabel} disabled readOnly />
              <em>Lecture seule — géré par WOLOYEM.</em>
            </label>
          </div>

          {profileState.error ? (
            <p className="text-sm font-medium text-rose-600" role="alert">
              {profileState.error}
            </p>
          ) : null}
          {profileState.message ? (
            <p className="text-sm font-medium text-teal-700">
              {profileState.message}
            </p>
          ) : null}

          <div className="ko-profile-form-footer">
            <button
              type="submit"
              className="ko-profile-btn is-primary"
              disabled={profilePending}
            >
              {profilePending
                ? "Enregistrement…"
                : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
