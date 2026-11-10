import Link from "next/link";
import type { ReactNode } from "react";
import { IconForward } from "../../shared/ui/icons";
import { Group } from "./settings-ui";

const rowClass = "flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-body text-text active:bg-surface-raised";

/**
 * `supportUrl` arrives as a prop rather than being read here. This component
 * renders inside a client tree, so a `NEXT_PUBLIC_*` read would be inlined at
 * build time and could never be configured at runtime. The server page reads
 * `SUPPORT_URL` from the environment and passes it down.
 */
export function HelpSupportPanel({ supportUrl }: { supportUrl?: string | undefined }): ReactNode {
  return (
    <nav aria-label="Help and legal">
      <Group>
        <SettingsLink href="/help">Help and example workout</SettingsLink>
        <SettingsLink href="/support">Contact support</SettingsLink>
        <SettingsLink href="/privacy">Privacy notice</SettingsLink>
        <SettingsLink href="/cookies">Cookies and storage</SettingsLink>
        <SettingsLink href="/terms">Terms</SettingsLink>
        {supportUrl ? (
          <a className={rowClass} href={supportUrl} rel="noreferrer" target="_blank">
            <span className="min-w-0">Support the project<span className="block text-footnote text-text-secondary">Voluntary, with no extra access or priority. The external provider’s terms apply.</span></span>
            <IconForward aria-hidden className="shrink-0 text-text-muted" />
          </a>
        ) : null}
      </Group>
    </nav>
  );
}

function SettingsLink({ children, href }: { children: ReactNode; href: string }): ReactNode {
  return <Link className={rowClass} href={href}><span className="min-w-0">{children}</span><IconForward aria-hidden className="shrink-0 text-text-muted" /></Link>;
}
