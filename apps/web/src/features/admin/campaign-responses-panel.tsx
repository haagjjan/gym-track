"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { Skeleton } from "../../shared/ui/ui";
import { FilterBar, ResultCount, SearchFilter, SelectFilter, humanise, matchesSearch } from "./admin-filters";

interface CampaignAnswer {
  userId: string;
  username: string;
  email: string;
  respondedAt: string | null;
  answer: string | null;
  state: "RESPONDED" | "DISMISSED" | "SEEN" | "PENDING";
}

interface CampaignReport {
  campaign: { id: string; title: string; status: string; responseType: string; responseOptions: string[] };
  totals: { delivered: number; seen: number; dismissed: number; responded: number };
  breakdown: Array<{ label: string; count: number }>;
  answers: CampaignAnswer[];
}

const states = ["RESPONDED", "DISMISSED", "SEEN", "PENDING"] as const;

/** What members actually answered for one campaign, with the tally on top. */
export function CampaignResponsesPanel({ campaignId }: { campaignId: string }): ReactNode {
  const [report, setReport] = useState<CampaignReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("RESPONDED");

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError(null);
    void apiFetch<CampaignReport>(`/api/admin/campaigns/${encodeURIComponent(campaignId)}/responses`)
      .then((result) => { if (!cancelled) setReport(result); })
      .catch((caught: unknown) => { if (!cancelled) setError(errorMessage(caught, "The answers could not be loaded.")); });
    return () => { cancelled = true; };
  }, [campaignId]);

  const visible = useMemo(() => (report?.answers ?? []).filter((answer) =>
    (state === "ALL" || answer.state === state)
    && matchesSearch(search, answer.username, answer.email, answer.answer)
  ), [report, search, state]);

  if (error) return <p className="mt-3 rounded border border-red/40 bg-red/5 p-3 text-xs text-red" role="alert">{error}</p>;
  if (!report) return <div className="mt-3 space-y-2"><Skeleton className="h-10" /><Skeleton className="h-24" /></div>;

  const { totals } = report;
  const responseRate = totals.delivered === 0 ? 0 : Math.round((totals.responded / totals.delivered) * 100);

  return (
    <div className="mt-3 border-t border-outline-dim/50 pt-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Delivered" value={String(totals.delivered)} />
        <Stat label="Seen" value={String(totals.seen)} />
        <Stat label="Answered" value={String(totals.responded)} />
        <Stat label="Dismissed" value={String(totals.dismissed)} />
        <Stat label="Answer rate" value={`${responseRate}%`} />
      </div>

      {report.breakdown.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {report.breakdown.map((entry) => (
            <li className="flex items-center gap-3 text-xs" key={entry.label}>
              <span className="min-w-0 flex-1 basis-32 break-words text-fg-muted">{entry.label}</span>
              <span
                aria-hidden
                className="h-2 shrink-0 rounded bg-cyan/60"
                style={{ width: `${totals.responded === 0 ? 0 : Math.round((entry.count / totals.responded) * 160)}px` }}
              />
              <span className="w-8 shrink-0 text-right font-mono text-fg">{entry.count}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3">
        <FilterBar>
          <SearchFilter label="Search" onChange={setSearch} placeholder="Member or answer text" value={search} />
          <SelectFilter label="State" onChange={setState} options={states} value={state} />
          <ResultCount noun="member" shown={visible.length} total={report.answers.length} />
        </FilterBar>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <caption className="sr-only">Answers to “{report.campaign.title}”</caption>
          <thead className="label-caps text-outline">
            <tr><th className="p-2">Member</th><th className="p-2">State</th><th className="p-2">Answered</th><th className="p-2">Answer</th></tr>
          </thead>
          <tbody>
            {visible.map((answer) => (
              <tr className="border-t border-outline-dim/50 align-top" key={answer.userId}>
                <td className="max-w-56 p-2"><span className="block break-words text-fg">{answer.username}</span><span className="block break-all text-[11px] text-outline">{answer.email}</span></td>
                <td className="p-2 text-xs text-cyan">{humanise(answer.state)}</td>
                <td className="p-2 text-xs text-fg-muted">{answer.respondedAt ? new Date(answer.respondedAt).toLocaleString() : "—"}</td>
                <td className="max-w-96 p-2"><span className="block whitespace-pre-wrap break-words text-xs text-fg">{answer.answer ?? "—"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {report.answers.length === 0 ? <p className="p-4 text-outline">This campaign has not been delivered to anyone yet.</p> : null}
        {report.answers.length > 0 && visible.length === 0 ? <p className="p-4 text-outline">No member matches these filters.</p> : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="min-w-0 rounded border border-outline-dim/50 bg-surface-low/30 px-3 py-2">
      <p className="label-caps text-outline">{label}</p>
      <p className="truncate font-mono text-lg text-fg">{value}</p>
    </div>
  );
}
