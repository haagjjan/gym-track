import Link from "next/link";
import type { ReactNode } from "react";
import { Panel } from "../../shared/ui/ui";

/**
 * `supportUrl` arrives as a prop rather than being read here. This component
 * renders inside a client tree, so a `NEXT_PUBLIC_*` read would be inlined at
 * build time and could never be configured at runtime. The server page reads
 * `SUPPORT_URL` from the environment and passes it down.
 */
export function HelpSupportPanel({ supportUrl }: { supportUrl?: string | undefined }): ReactNode {
  return (
    <Panel accent="cyan" eyebrow="HELP_SUPPORT_AND_POLICIES">
      <nav className="grid gap-2 text-sm">
        <SettingsLink href="/help">Help, tutorial & practice workout</SettingsLink>
        <SettingsLink href="/support">Contact support & service status</SettingsLink>
        <SettingsLink href="/privacy">Privacy Notice & data rights</SettingsLink>
        <SettingsLink href="/cookies">Cookie & device storage notice</SettingsLink>
        <SettingsLink href="/terms">Terms & beta limitations</SettingsLink>
        {supportUrl ? <a className="min-h-11 rounded border border-lavender/40 px-3 py-3 text-lavender hover:bg-lavender/5" href={supportUrl} rel="noreferrer" target="_blank">Support the project ↗<span className="block text-[10px] text-outline">Voluntary; no extra access or priority. The external provider’s terms apply.</span></a> : null}
      </nav>
    </Panel>
  );
}

function SettingsLink({ children, href }: { children: ReactNode; href: string }): ReactNode {
  return <Link className="flex min-h-11 items-center rounded border border-outline-dim/60 px-3 text-fg hover:border-cyan/50 hover:text-cyan" href={href}>{children}</Link>;
}
