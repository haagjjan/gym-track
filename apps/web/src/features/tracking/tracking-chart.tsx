"use client";

import { useState, type ReactNode } from "react";
import { trackingInputClass } from "./timed-set-form";

export interface TrackingPoint { id: string; date: string; value: number; detail: string }
/** A bounded chart with an equivalent table and keyboard-accessible entry readout. */
export function TrackingChart({ points, unit, emptyMessage = "Finish a workout with a logged entry to see progress." }: { points: TrackingPoint[]; unit: string; emptyMessage?: string }): ReactNode {
  const [table, setTable] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = points.find((point) => point.id === selectedId) ?? points.at(-1);
  const max = points.reduce((value, point) => Math.max(value, point.value), 1);
  const coordinates = points.map((point, index) => `${20 + index / Math.max(points.length - 1, 1) * 560},${190 - point.value / max * 170}`).join(" ");
  if (!selected) return <p className="text-body text-text-secondary">{emptyMessage}</p>;
  return <div className="mt-3 space-y-3">
    <button aria-pressed={table} className="min-h-11 text-body text-accent" onClick={() => setTable(!table)} type="button">{table ? "Show chart" : "Show table"}</button>
    {table ? <div className="overflow-x-auto"><table className="w-full text-left text-subhead text-text"><thead><tr><th className="py-2">Date</th><th>Entry</th></tr></thead><tbody>{points.map((point) => <tr className="border-t border-line" key={point.id}><td className="py-2 pr-3">{new Date(point.date).toLocaleDateString()}</td><td className="num">{point.detail}</td></tr>)}</tbody></table></div> : <>
      <p className="num text-footnote text-text-secondary">0–{max.toLocaleString()} {unit}</p>
      <svg aria-label={`${unit} across ${points.length} logged entries. Choose an entry below for its values.`} className="h-52 w-full text-accent" role="img" viewBox="0 0 600 220">
        <path d="M20 20V190H580" fill="none" stroke="var(--line)" strokeWidth="1" />
        <polyline fill="none" points={coordinates} stroke="currentColor" strokeWidth="3" />
        {points.map((point, index) => <circle cx={20 + index / Math.max(points.length - 1, 1) * 560} cy={190 - point.value / max * 170} fill="currentColor" key={point.id} r={point.id === selected.id ? 6 : 3} />)}
      </svg>
      <label className="block text-subhead text-text-secondary">Entry<select aria-label="Entry" className={trackingInputClass} onChange={(event) => setSelectedId(event.target.value)} value={selected.id}>{points.map((point) => <option key={point.id} value={point.id}>{new Date(point.date).toLocaleDateString()} — {point.detail}</option>)}</select></label>
      <p className="num text-body text-text" role="status">{selected.detail}</p>
    </>}
  </div>;
}
