import Link from "next/link";
import type { ReactNode } from "react";
import { WaitlistForm } from "../../features/beta/waitlist-form";

export const metadata = { title: "Founding Beta" };

export default function BetaPage(): ReactNode {
  return (
    <main className="hud-grid min-h-dvh bg-void px-5 py-12 text-fg">
      <section className="glass-cyan mx-auto max-w-xl rounded-xl p-6 sm:p-8">
        <p className="label-caps text-cyan">FOUNDING_BETA · INVITATION_ONLY</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Limited to 50 founding members</h1>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">Anyone can request access. Each request is reviewed personally, and selected members receive a seven-day invitation. Access has no scheduled expiry.</p>
        <div className="mt-7"><WaitlistForm /></div>
        <p className="mt-5 text-center text-xs text-outline">Already invited or a member? <Link className="text-cyan" href="/login">Log in</Link></p>
      </section>
    </main>
  );
}
