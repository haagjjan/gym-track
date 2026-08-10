import type { ReactNode } from "react";
import { LegalPage, Section, legalContacts } from "../../features/legal/legal-page";

export const metadata = { title: "Privacy Notice" };

// See legal-page.tsx: contact details are read from server environment per
// request, so this route must not be statically prerendered.
export const dynamic = "force-dynamic";

export default function PrivacyPage(): ReactNode {
  const contact = legalContacts();
  return <LegalPage eyebrow="DATA_TRANSPARENCY" title="Privacy Notice">
    <Section title="Controller and contact"><p>{contact.controller}, {contact.address}, controls the processing described here. Privacy requests: {contact.privacyEmail}. Support: {contact.supportEmail}.</p><p>This notice is written for the Swiss Federal Act on Data Protection. The Founding Beta is offered only to adults resident in Switzerland.</p></Section>
    <Section title="Data we process"><p>We process waitlist email and adult/privacy acknowledgements; account email, username, password hash and authentication records; workout sessions, exercises, sets, notes, templates and calculated progress; privacy and tutorial preferences; optional campaign responses; and, only after opt-in, account-linked first-party product events.</p><p>Body profile, favorite lifts, display settings, active set drafts and filters may be stored in your browser and scoped to the signed-in user. Active-set drafts use local storage for recovery and expire no later than 24 hours after their most recent edit. The app does not use advertising or third-party analytics trackers.</p></Section>
    <Section title="Purposes"><p>Data is used to operate and secure accounts, provide workout logging and analysis, control the invitation-only beta, recover access, answer support requests, deliver optional in-app feedback prompts, improve the product where consent was given, and meet security/legal obligations.</p></Section>
    <Section title="Processors and transfers"><p>The final processor list must name the actual hosting, Cloudflare edge/tunnel, Resend email, encrypted backup destination, and any external support/status provider, including destination countries and transfer safeguards. Telegram receives only a random request reference and timestamp, not applicant email.</p></Section>
    <Section title="Retention"><p>Active account/workout data remains until deletion. Pending waitlist requests retain up to 180 days; expired/consumed invitations 30 days; opt-in identifiable product events 90 days; campaign responses 180 days after closure; application logs/metrics and encrypted backups at most 30 days; local plaintext dumps seven days.</p></Section>
    <Section title="Your choices and rights"><p>You can export account data, disable optional analytics/feedback/device storage, clear this device, and schedule account deletion from Settings. Depending on applicable law, you may request access, correction, restriction, portability, objection or erasure through the privacy contact.</p></Section>
    <Section title="Deletion and backups"><p>Deletion locks access immediately and permanently removes live personal data after a seven-day cancellation period. Shared exercise definitions referenced by other users may remain only after creator identity is removed. Encrypted recovery backups age out within 30 days and are not used to recover an individually deleted account.</p></Section>
  </LegalPage>;
}
