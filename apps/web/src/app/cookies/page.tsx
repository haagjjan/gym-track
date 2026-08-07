import type { ReactNode } from "react";
import { LegalPage, Section } from "../../features/legal/legal-page";

export const metadata = { title: "Cookie & Device Storage Notice" };

export default function CookiesPage(): ReactNode {
  return <LegalPage eyebrow="STORAGE_CONTROL" title="Cookie & Device Storage Notice">
    <Section title="Essential session cookie"><p><code>gym_progress_session</code> (name configurable) is a Secure, HttpOnly, SameSite=Lax login cookie. It contains a random opaque token; the database stores only its hash. Its maximum lifetime is 30 days, and logout, password reset, deletion, or security action can revoke it earlier.</p></Section>
    <Section title="Essential recovery storage"><p>Unfinished active-set drafts are stored in this browser&apos;s local storage and scoped by signed-in user, workout and exercise so a refresh or phone interruption does not lose current input. Each draft expires no later than 24 hours after its most recent edit. It is also removed after save, cancellation, workout completion or deletion, account deletion, or explicit device-data clearing.</p></Section>
    <Section title="Optional functional storage"><p>With permission, local storage remembers user-scoped body profile, favorite lifts, display preferences and related conveniences. Choosing Essential only keeps these values only for the current page/session where possible. You can change the choice or clear stored values in Settings.</p></Section>
    <Section title="Analytics"><p>First-party product events are stored on the server only after account opt-in. They are not browser trackers and are not sent to an advertising network. Security and administrator audit records are processed separately as essential service records.</p></Section>
  </LegalPage>;
}
