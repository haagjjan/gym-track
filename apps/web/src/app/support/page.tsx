import type { ReactNode } from "react";
import { LegalPage, Section, legalContacts } from "../../features/legal/legal-page";

export const metadata = { title: "Support" };

// Contact details are read from server environment per request. Without this the
// route is statically prerendered at build time and the placeholders freeze in.
export const dynamic = "force-dynamic";

export default function SupportPage(): ReactNode {
  const contact = legalContacts();
  return <LegalPage eyebrow="BEST_EFFORT_SUPPORT" title="Support & Service Status">
    <Section title="Contact"><p>Email {contact.supportEmail}. Include what you were doing, the approximate time, route/screen, browser family and device class. Do not send your password, session cookie, invitation token, verification link, or password-reset link.</p></Section>
    <Section title="Account deletion recovery"><p>If deletion is pending and you changed your mind, use the emailed cancellation link or contact support immediately before the stated deadline. Permanently deleted personal records cannot be recovered.</p></Section>
    <Section title="Service announcements"><p>Anything affecting everyone — planned downtime, a significant problem, or a fix worth knowing about — appears as a message inside the app. You do not need to check anywhere else.</p><p>This is a beta running on a single self-hosted server. It may be slow, unavailable, or interrupted without notice. Please export your workout history from Settings now and then, so nothing you would miss depends only on this service.</p></Section>
    <Section title="Security reports"><p>Send responsible security reports to {contact.securityEmail}. Replies come from {contact.supportEmail} — both addresses reach the same person. Please give us a reasonable chance to fix an issue before disclosing it publicly. Do not access, modify or retain another user’s data while testing, and do not run disruptive tests against the live service. No bounty is offered, but genuine reports are welcome and credited on request.</p></Section>
  </LegalPage>;
}
