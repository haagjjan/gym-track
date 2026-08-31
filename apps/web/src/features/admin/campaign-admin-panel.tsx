"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { HudButton, Panel } from "../../shared/ui/ui";
import { FilterBar, ResultCount, SearchFilter, SelectFilter, humanise, matchesSearch } from "./admin-filters";
import { CampaignResponsesPanel } from "./campaign-responses-panel";
import type { AdminUser } from "./admin-types";

type CampaignStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "ENDED";
type CampaignAction = "PUBLISH" | "PAUSE" | "RESUME" | "END";

interface Campaign {
  id: string;
  title: string;
  status: CampaignStatus;
  triggerType: string;
  responseType: string;
  createdAt: string;
}

const campaignStatuses = ["DRAFT", "PUBLISHED", "PAUSED", "ENDED"] as const;
const triggerTypes = ["NEXT_LOGIN", "NTH_LOGIN", "NTH_WORKOUT", "AFTER_WORKOUT", "SCHEDULED"] as const;
const responseTypes = ["ACKNOWLEDGEMENT", "RATING", "SINGLE_CHOICE", "FREE_TEXT"] as const;

/**
 * Actions that change what members see and cannot be taken back are confirmed
 * before they run. Publishing in particular used to be a single click with no
 * pending state, which made a slow round trip look like a dead button and
 * invited a second click — and a second delivery sweep.
 */
const confirmedActions: Record<CampaignAction, { title: string; message: string; confirmLabel: string; pendingLabel: string }> = {
  PUBLISH: {
    title: "Publish this campaign?",
    message: "Publishing delivers this message to every member in its audience. It cannot be unpublished — you can only pause or end it afterwards.",
    confirmLabel: "PUBLISH",
    pendingLabel: "PUBLISHING…"
  },
  END: {
    title: "End this campaign?",
    message: "Ending stops delivery for good. Members who have not answered yet will never see it, and the campaign cannot be published again.",
    confirmLabel: "END",
    pendingLabel: "ENDING…"
  },
  PAUSE: {
    title: "Pause this campaign?",
    message: "Pausing hides the message until you resume it. Answers already given are kept.",
    confirmLabel: "PAUSE",
    pendingLabel: "PAUSING…"
  },
  RESUME: {
    title: "Resume this campaign?",
    message: "Members in the audience who have not answered or dismissed it will start seeing this message again.",
    confirmLabel: "RESUME",
    pendingLabel: "RESUMING…"
  }
};

export function CampaignAdminPanel(): ReactNode {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [state, setState] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [pending, setPending] = useState<{ action: CampaignAction; campaign: Campaign } | null>(null);
  // Set for the whole round trip, so a second click cannot start a second
  // publish while the first is still in flight.
  const [runningId, setRunningId] = useState<string | null>(null);
  const [openResponsesId, setOpenResponsesId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [userResult, campaignResult] = await Promise.all([
      apiFetch<{ items: AdminUser[] }>("/api/admin/users"),
      apiFetch<{ items: Campaign[] }>("/api/admin/campaigns")
    ]);
    setUsers(userResult.items.filter((user) => user.role === "USER" && user.status === "ACTIVE"));
    setCampaigns(campaignResult.items);
  }, []);
  useEffect(() => { void load().catch((error) => setState(errorMessage(error, "Campaign data could not be loaded."))); }, [load]);

  const visible = useMemo(() => campaigns.filter((campaign) =>
    (status === "ALL" || campaign.status === status)
    && matchesSearch(search, campaign.title, campaign.triggerType, campaign.responseType)
  ), [campaigns, search, status]);

  async function runAction(): Promise<void> {
    if (!pending || runningId !== null) return;
    const { action, campaign } = pending;
    setRunningId(campaign.id);
    setState(null);
    try {
      await apiFetch(`/api/admin/campaigns/${encodeURIComponent(campaign.id)}/action`, {
        method: "POST",
        body: { action }
      });
      await load();
      setState(`“${campaign.title}” — ${humanise(action).toLowerCase()} applied and recorded in the audit log.`);
      setPending(null);
    } catch (error) {
      setState(errorMessage(error, "The campaign action failed."));
      setPending(null);
    } finally {
      setRunningId(null);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold text-fg">In-app campaigns</h2>

      <CampaignDraftForm
        onCreated={async (message) => { await load(); setState(message); }}
        onError={setState}
        users={users}
      />

      <Panel accent="cyan" eyebrow="Campaigns">
        <FilterBar>
          <SearchFilter label="Search" onChange={setSearch} placeholder="Title, trigger, or response type" value={search} />
          <SelectFilter label="Status" onChange={setStatus} options={campaignStatuses} value={status} />
          <ResultCount noun="campaign" shown={visible.length} total={campaigns.length} />
        </FilterBar>

        <div className="mt-3 space-y-2">
          {visible.map((campaign) => (
            <article className="rounded border border-outline-dim/60 p-3" key={campaign.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="break-words text-sm font-bold text-fg">{campaign.title}</p>
                  <p className="break-words text-[11px] text-outline">
                    {humanise(campaign.status)} · {humanise(campaign.triggerType)} · {humanise(campaign.responseType)} · created {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  {campaign.status === "DRAFT" ? <Action busy={runningId === campaign.id} label="Publish" onClick={() => setPending({ action: "PUBLISH", campaign })} /> : null}
                  {campaign.status === "PUBLISHED" ? <>
                    <Action busy={runningId === campaign.id} label="Pause" onClick={() => setPending({ action: "PAUSE", campaign })} />
                    <Action busy={runningId === campaign.id} label="End" onClick={() => setPending({ action: "END", campaign })} />
                  </> : null}
                  {campaign.status === "PAUSED" ? <>
                    <Action busy={runningId === campaign.id} label="Resume" onClick={() => setPending({ action: "RESUME", campaign })} />
                    <Action busy={runningId === campaign.id} label="End" onClick={() => setPending({ action: "END", campaign })} />
                  </> : null}
                  {campaign.status === "DRAFT" ? null : (
                    <Action
                      busy={false}
                      label={openResponsesId === campaign.id ? "Hide answers" : "View answers"}
                      onClick={() => setOpenResponsesId((current) => current === campaign.id ? null : campaign.id)}
                    />
                  )}
                </div>
              </div>
              {openResponsesId === campaign.id ? <CampaignResponsesPanel campaignId={campaign.id} /> : null}
            </article>
          ))}
          {campaigns.length === 0 ? <p className="p-4 text-outline">No campaigns yet.</p> : null}
          {campaigns.length > 0 && visible.length === 0 ? <p className="p-4 text-outline">No campaign matches these filters.</p> : null}
        </div>
      </Panel>

      {state ? <p className="text-sm text-outline" role="status">{state}</p> : null}

      <ConfirmDialog
        confirmLabel={pending ? confirmedActions[pending.action].confirmLabel : "CONFIRM"}
        isOpen={pending !== null}
        isPending={runningId !== null}
        message={pending ? `${confirmedActions[pending.action].message}\n\nCampaign: “${pending.campaign.title}”.` : ""}
        onCancel={() => { if (runningId === null) setPending(null); }}
        onConfirm={() => void runAction()}
        pendingLabel={pending ? confirmedActions[pending.action].pendingLabel : "WORKING…"}
        title={pending ? confirmedActions[pending.action].title : "Confirm action"}
        tone={pending?.action === "END" ? "danger" : "warning"}
      />
    </section>
  );
}

function CampaignDraftForm({
  onCreated,
  onError,
  users
}: {
  onCreated: (message: string) => Promise<void>;
  onError: (message: string) => void;
  users: AdminUser[];
}): ReactNode {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState<"ALL" | "SELECTED">("ALL");
  const [triggerType, setTriggerType] = useState<(typeof triggerTypes)[number]>("NEXT_LOGIN");
  const [responseType, setResponseType] = useState<(typeof responseTypes)[number]>("ACKNOWLEDGEMENT");
  const [threshold, setThreshold] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [options, setOptions] = useState("");
  const [essential, setEssential] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const needsThreshold = triggerType === "NTH_LOGIN" || triggerType === "NTH_WORKOUT";
  const needsSchedule = triggerType === "SCHEDULED";
  const needsOptions = responseType === "SINGLE_CHOICE";
  const audienceUsers = users.filter((user) => matchesSearch(userSearch, user.username, user.email));

  function reset(): void {
    setTitle(""); setBody(""); setAudienceType("ALL"); setTriggerType("NEXT_LOGIN");
    setResponseType("ACKNOWLEDGEMENT"); setThreshold(""); setScheduledAt("");
    setActionUrl(""); setOptions(""); setEssential(false); setSelected([]); setUserSearch("");
  }

  async function create(): Promise<void> {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await apiFetch("/api/admin/campaigns", {
        method: "POST",
        body: {
          title,
          body,
          audienceType,
          targetUserIds: audienceType === "SELECTED" ? selected : [],
          triggerType,
          triggerThreshold: needsThreshold ? Number(threshold) : null,
          responseType,
          responseOptions: needsOptions
            ? options.split("\n").map((item) => item.trim()).filter(Boolean)
            : [],
          actionUrl: actionUrl.trim() || null,
          essential,
          scheduledAt: needsSchedule ? new Date(scheduledAt).toISOString() : null,
          startsAt: null,
          endsAt: null
        }
      });
      reset();
      await onCreated("Draft saved. Review it below, then publish when you are ready.");
    } catch (error) {
      onError(errorMessage(error, "The draft could not be saved."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel accent="lavender" eyebrow="New draft">
      <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void create(); }}>
        <Labelled label="Title">
          <input className={inputClass} maxLength={120} onChange={(event) => setTitle(event.currentTarget.value)} required value={title} />
        </Labelled>

        <Labelled label="Message">
          <textarea className={inputClass} maxLength={2000} onChange={(event) => setBody(event.currentTarget.value)} required rows={5} value={body} />
        </Labelled>

        <div className="grid gap-3 sm:grid-cols-3">
          <Labelled label="Who sees it">
            <select className={inputClass} onChange={(event) => setAudienceType(event.currentTarget.value as "ALL" | "SELECTED")} value={audienceType}>
              <option value="ALL">Every member</option>
              <option value="SELECTED">Chosen members</option>
            </select>
          </Labelled>
          <Labelled label="When it appears">
            <select className={inputClass} onChange={(event) => setTriggerType(event.currentTarget.value as typeof triggerType)} value={triggerType}>
              {triggerTypes.map((option) => <option key={option} value={option}>{triggerLabel(option)}</option>)}
            </select>
          </Labelled>
          <Labelled label="What members can answer">
            <select className={inputClass} onChange={(event) => setResponseType(event.currentTarget.value as typeof responseType)} value={responseType}>
              {responseTypes.map((option) => <option key={option} value={option}>{responseLabel(option)}</option>)}
            </select>
          </Labelled>
        </div>

        {needsThreshold ? (
          <Labelled label={triggerType === "NTH_LOGIN" ? "Show on which sign-in" : "Show after how many workouts"}>
            <input className={inputClass} min="1" onChange={(event) => setThreshold(event.currentTarget.value)} required type="number" value={threshold} />
          </Labelled>
        ) : null}

        {needsSchedule ? (
          <Labelled hint="Interpreted in this browser's time zone." label="Show from">
            <input className={inputClass} onChange={(event) => setScheduledAt(event.currentTarget.value)} required type="datetime-local" value={scheduledAt} />
          </Labelled>
        ) : null}

        {needsOptions ? (
          <Labelled hint="One per line. At least two." label="Answer choices">
            <textarea className={inputClass} maxLength={500} onChange={(event) => setOptions(event.currentTarget.value)} rows={3} value={options} />
          </Labelled>
        ) : null}

        <Labelled hint="Optional. Must start with https://." label="Link shown with the message">
          <input className={inputClass} onChange={(event) => setActionUrl(event.currentTarget.value)} type="url" value={actionUrl} />
        </Labelled>

        {audienceType === "SELECTED" ? (
          <fieldset>
            <legend className="label-caps text-outline">Chosen members ({selected.length})</legend>
            <input
              aria-label="Search members"
              className={`${inputClass} mb-2`}
              onChange={(event) => setUserSearch(event.currentTarget.value)}
              placeholder="Search by username or email"
              type="search"
              value={userSearch}
            />
            <div className="grid max-h-48 gap-1 overflow-y-auto rounded border border-outline-dim p-2 sm:grid-cols-2">
              {audienceUsers.map((user) => (
                <label className="flex min-h-10 items-center gap-2 text-xs text-fg" key={user.id}>
                  <input
                    checked={selected.includes(user.id)}
                    className="shrink-0"
                    onChange={() => setSelected((value) => value.includes(user.id) ? value.filter((id) => id !== user.id) : [...value, user.id])}
                    type="checkbox"
                  />
                  <span className="min-w-0 break-all">{user.username} · {user.email}</span>
                </label>
              ))}
              {audienceUsers.length === 0 ? <p className="text-xs text-outline">No member matches that search.</p> : null}
            </div>
          </fieldset>
        ) : null}

        <label className="flex min-h-11 items-center gap-2 text-sm text-fg">
          <input checked={essential} className="shrink-0" onChange={(event) => setEssential(event.currentTarget.checked)} type="checkbox" />
          <span>Service or security notice — reaches members who turned optional prompts off</span>
        </label>

        <HudButton disabled={isSaving} type="submit">{isSaving ? "SAVING…" : "SAVE DRAFT"}</HudButton>
      </form>
    </Panel>
  );
}

const inputClass = "mt-1 min-h-11 w-full min-w-0 rounded border border-outline-dim bg-surface-low px-3 py-2 text-sm text-fg";

function Labelled({ children, hint, label }: { children: ReactNode; hint?: string; label: string }): ReactNode {
  return (
    <label className="block min-w-0">
      <span className="label-caps text-outline">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-outline">{hint}</span> : null}
    </label>
  );
}

function Action({ busy, label, onClick }: { busy: boolean; label: string; onClick(): void }): ReactNode {
  return (
    <button
      className="min-h-10 rounded border border-cyan/50 px-2 text-[11px] text-cyan disabled:cursor-wait disabled:opacity-50"
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {busy ? "WORKING…" : label}
    </button>
  );
}

function triggerLabel(value: (typeof triggerTypes)[number]): string {
  if (value === "NEXT_LOGIN") return "On their next sign-in";
  if (value === "NTH_LOGIN") return "On a specific sign-in";
  if (value === "NTH_WORKOUT") return "After a specific workout count";
  if (value === "AFTER_WORKOUT") return "After their next workout";
  return "At a scheduled time";
}

function responseLabel(value: (typeof responseTypes)[number]): string {
  if (value === "ACKNOWLEDGEMENT") return "Just acknowledge";
  if (value === "RATING") return "Rating from 1 to 5";
  if (value === "SINGLE_CHOICE") return "Pick one choice";
  return "Free text";
}
