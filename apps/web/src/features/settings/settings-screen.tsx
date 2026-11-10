"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { apiFetch } from "../../shared/api/client";
import { useUserPreferences } from "../../shared/api/hooks";
import type { AuthUser } from "../auth/auth-types";
import { emptyBiometrics, useBiometrics, type Biometrics } from "../dashboard/use-biometrics";
import { MAX_FAVORITE_LIFTS, useFavoriteLifts } from "../dashboard/use-favorite-lifts";
import { formatRestSeconds, useRestPreference } from "../session/use-rest-preferences";
import { HEAT_MAX_WEEKLY_SETS } from "../volume/heatmap";
import { IconForward, IconLogout } from "../../shared/ui/icons";
import { InfoPopover } from "../../shared/ui/info-popover";
import { Sheet } from "../../shared/ui/sheet";
import { DisplayPanel } from "./display-panel";
import { FavoriteLiftsPanel } from "./favorite-lifts-panel";
import { HeatCeilingPanel } from "./heat-ceiling-panel";
import { HelpSupportPanel } from "./help-support-panel";
import { MergeExercisesPanel } from "./merge-exercises-panel";
import { PrivacyDataPanel } from "./privacy-data-panel";
import { RestTimerPanel } from "./rest-timer-panel";
import { Group, Row, Section, SavedStatus, inputClass, useSavedFlash } from "./settings-ui";

/**
 * Settings as one short list (iOS Settings style): each row shows its current
 * value, and anything bigger than a switch opens in a sheet. Quick choices
 * (theme, figure spin) stay inline.
 */
export function SettingsScreen({ supportUrl, user }: { supportUrl?: string | undefined; user: AuthUser }): ReactNode {
  const router = useRouter();
  const { restSeconds, isLoaded: restLoaded } = useRestPreference();
  const { favorites, isLoaded: favoritesLoaded } = useFavoriteLifts();
  const preferences = useUserPreferences();
  const { biometrics, isLoaded: bodyLoaded } = useBiometrics();
  const heatCeiling = preferences.data?.volumeHeatCeiling ?? HEAT_MAX_WEEKLY_SETS;

  async function logout(): Promise<void> {
    await apiFetch("/api/auth/logout", { method: "POST", body: {} }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-8 pt-4">
      <h1 className="text-large-title text-text">Settings</h1>

      <AccountCard user={user} />

      <Section title="Training">
        <Group>
          <SheetRow label="Rest between sets" value={restLoaded ? (restSeconds === 0 ? "Off" : formatRestSeconds(restSeconds)) : ""}>
            <RestTimerPanel />
          </SheetRow>
          <SheetRow label="Pinned lifts" value={favoritesLoaded ? `${favorites.length} of ${MAX_FAVORITE_LIFTS}` : ""}>
            <FavoriteLiftsPanel />
          </SheetRow>
          <SheetRow label="Full color on body map" value={preferences.isLoading ? "" : `${heatCeiling} sets`}>
            <HeatCeilingPanel />
          </SheetRow>
          <SheetRow label="Body profile" value={bodyLoaded ? bodySummary(biometrics) : ""}>
            <BodyProfileForm />
          </SheetRow>
          <SheetRow label="Merge duplicate exercises">
            <MergeExercisesPanel />
          </SheetRow>
        </Group>
      </Section>

      <Section title="Appearance">
        <DisplayPanel />
      </Section>

      <Section title="Privacy and data">
        <Group>
          <SheetRow label="Privacy choices"><PrivacyDataPanel section="choices" /></SheetRow>
          <SheetRow label="Download your data"><PrivacyDataPanel section="download" /></SheetRow>
        </Group>
      </Section>

      <Section title="Help and legal">
        <HelpSupportPanel supportUrl={supportUrl} />
      </Section>

      <Group>
        <button className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-body text-text active:bg-surface-raised" onClick={() => void logout()} type="button">
          <IconLogout aria-hidden className="text-text-secondary" /> Sign out
        </button>
        <SheetRow danger label="Delete account"><PrivacyDataPanel section="delete" /></SheetRow>
      </Group>
    </div>
  );
}

/**
 * A settings row that opens its editor in a sheet. The sheet carries the
 * title and a Done button, so editors only show their own explanation.
 */
function SheetRow({ children, danger = false, label, value }: { children: ReactNode; danger?: boolean; label: string; value?: string }): ReactNode {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return (
    <>
      <button
        className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-raised"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className={`min-w-0 flex-1 truncate text-body ${danger ? "text-danger" : "text-text"}`}>{label}</span>
        {value ? <span className="num shrink-0 text-body text-text-secondary">{value}</span> : null}
        <IconForward aria-hidden className="shrink-0 text-text-muted" />
      </button>
      <Sheet className="max-h-[88dvh] overflow-y-auto" isOpen={open} labelledBy={titleId} onClose={() => setOpen(false)} portal width="2xl">
        <div className="mb-3 mt-1 flex items-center justify-between gap-3">
          {/* Focus the title, not the first field: no keyboard popping up on open. */}
          <h2 className="text-title-3 text-text outline-none" data-modal-initial-focus id={titleId} tabIndex={-1}>{label}</h2>
          <Button className="-mr-3 shrink-0" onClick={() => setOpen(false)} size="compact" variant="plain">Done</Button>
        </div>
        {children}
      </Sheet>
    </>
  );
}

function AccountCard({ user }: { user: AuthUser }): ReactNode {
  return (
    <Group>
      <Row className="flex items-center gap-3">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised text-title-3 text-text">
          {user.username.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-headline text-text">{user.username}</p>
          <p className="truncate text-subhead text-text-secondary">{user.email}</p>
        </div>
      </Row>
      {!user.emailVerified ? <EmailVerificationNotice /> : null}
    </Group>
  );
}

function EmailVerificationNotice(): ReactNode {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "not_required" | "failed">("idle");
  async function resend(): Promise<void> {
    setState("sending");
    try {
      const result = await apiFetch<{ status: "FAILED" | "NOT_REQUIRED" | "SENT" }>("/api/auth/resend-verification", { method: "POST", body: {} });
      setState(result.status === "FAILED" ? "failed" : result.status === "NOT_REQUIRED" ? "not_required" : "sent");
    } catch { setState("failed"); }
  }
  return (
    <Row className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-body text-warning">Email not confirmed</p>
        <p className="text-footnote text-text-secondary">Confirm it so you can recover your account.</p>
        {state === "failed" ? <p className="text-footnote text-danger" role="alert">Couldn&rsquo;t send the link. Try again.</p> : null}
      </div>
      <Button className="shrink-0" disabled={state === "sending" || state === "sent" || state === "not_required"} onClick={() => void resend()} size="compact" variant="plain">{state === "sent" ? "Link sent" : state === "not_required" ? "Already confirmed" : state === "sending" ? "Sending…" : state === "failed" ? "Try again" : "Resend link"}</Button>
    </Row>
  );
}

function bodySummary(body: Biometrics): string {
  const parts = [body.weightKg ? `${body.weightKg} kg` : null, body.heightCm ? `${body.heightCm} cm` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Not set";
}

function BodyProfileForm(): ReactNode {
  const { biometrics, save, isLoaded } = useBiometrics();
  const [form, setForm] = useState<Biometrics>(emptyBiometrics);
  const { flash, saved } = useSavedFlash();

  useEffect(() => {
    if (isLoaded) setForm(biometrics);
  }, [biometrics, isLoaded]);

  return (
    <div>
      <p className="mb-3 text-footnote text-text-secondary">
        Optional, for the body profile on Home. Stays on this device.
        <InfoPopover label="body profile storage">Body stats are optional and saved only on this device for this account. They are not part of the account data download.</InfoPopover>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <BioField label="Age (years)" onChange={(age) => setForm({ ...form, age })} value={form.age} />
        <BioField label="Height (cm)" onChange={(heightCm) => setForm({ ...form, heightCm })} value={form.heightCm} />
        <BioField label="Weight (kg)" onChange={(weightKg) => setForm({ ...form, weightKg })} value={form.weightKg} />
        <BioField label="Body fat (%)" onChange={(bodyFatPct) => setForm({ ...form, bodyFatPct })} value={form.bodyFatPct} />
      </div>
      <Button className="mt-4 w-full" onClick={() => { save(form); flash(); }}>Save</Button>
      <div className="mt-2"><SavedStatus saved={saved} /></div>
    </div>
  );
}

function BioField({ label, onChange, value }: { label: string; onChange: (value: number | null) => void; value: number | null }): ReactNode {
  return <label className="block"><span className="mb-1 block text-subhead text-text-secondary">{label}</span><input className={`${inputClass} num`} inputMode="decimal" onChange={(event) => { const raw = event.currentTarget.value.trim(); const parsed = Number(raw); onChange(raw.length === 0 || Number.isNaN(parsed) ? null : parsed); }} type="text" value={value ?? ""} /></label>;
}
