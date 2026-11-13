"use client";

import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../shared/ui/button";
import { trackingInputClass } from "./timed-set-form";

export function TrackingCsvPanel(): ReactNode {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  return <section className="mt-6 rounded-[var(--radius-card)] bg-surface p-4" aria-label="Time and cardio CSV">
    <h2 className="text-title-3 text-text">Time and cardio CSV</h2>
    <p className="mt-2 text-subhead text-text-secondary">Completed workouts only. This file is separate from the strength CSV. Import creates new completed workouts; it does not merge into existing ones. Create any named time exercises first.</p>
    <a className="inline-flex min-h-11 items-center text-body text-accent" href="/api/tracking/export.csv" download>Export time and cardio</a>
    <form className="mt-3 space-y-3" onSubmit={(event) => {
      event.preventDefault();
      if (!file || pending) return;
      setPending(true); setStatus("");
      void file.text().then(async (text) => {
        const response = await fetch("/api/tracking/import.csv", { method: "POST", headers: { "content-type": "text/csv" }, body: text });
        const payload = await response.json() as { data?: { importedRows: number }; error?: { message?: string; details?: { errors?: { row: number; message: string }[] } } };
        if (!response.ok) throw new Error(payload.error?.details?.errors?.map((error) => `Row ${error.row}: ${error.message}`).join(" ") || payload.error?.message || "Couldn't import this CSV.");
        setStatus(`Imported ${payload.data?.importedRows ?? 0} entries.`);
        await Promise.all([client.invalidateQueries({ queryKey: ["tracking"] }), client.invalidateQueries({ queryKey: ["tracking-progress"] }), client.invalidateQueries({ queryKey: ["workouts"] }), client.invalidateQueries({ queryKey: ["workouts-infinite"] }), client.invalidateQueries({ queryKey: ["weekly-volume"] })]);
      }).catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Check your connection and try again.")).finally(() => setPending(false));
    }}>
      <label className="block text-subhead text-text-secondary">Import a time/cardio file<input accept=".csv,text/csv" className={trackingInputClass} disabled={pending} onChange={(event) => setFile(event.target.files?.[0] ?? null)} required type="file" /></label>
      <Button disabled={!file || pending} type="submit" variant="secondary">{pending ? "Importing…" : "Import time and cardio"}</Button>
    </form>
    {status ? <p className="mt-3 break-words text-body text-text" role="status">{status}</p> : null}
  </section>;
}
