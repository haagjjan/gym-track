import type { ReactNode } from "react";
import { LegalPage, Section, legalContacts } from "../../features/legal/legal-page";
import { ExternalLink } from "../../shared/ui/external-link";

export const metadata = { title: "Support" };

// Contact details are read from server environment per request. Without this the
// route is statically prerendered at build time and the placeholders freeze in.
export const dynamic = "force-dynamic";

export default function SupportPage(): ReactNode {
  const contact = legalContacts();
  return <LegalPage eyebrow="Help" title="Support">
    <Section title="Contact"><p>Email {contact.supportEmail}. Say what you were doing, roughly when, which screen it was, and what browser and device you use. Do not send your password, session cookie, verification link, or password-reset link.</p></Section>
    <Section title="Account deletion recovery"><p>If deletion is pending and you changed your mind, use the emailed cancellation link or contact support immediately before the stated deadline. Permanently deleted personal records cannot be recovered.</p></Section>
    <Section title="Service announcements"><p>Anything affecting everyone, like planned downtime, a significant problem or a fix worth knowing about, appears as a message inside the app and on the <ExternalLink className="text-accent underline" href="https://status.gymtrack.ch">service status page</ExternalLink>.</p><p>This is an early version running on a single self-hosted server. It may be slow, unavailable, or interrupted without notice. Export your workouts from History now and then, so nothing you would miss depends only on this service.</p></Section>
    <Section title="Security reports"><p>Send responsible security reports to {contact.securityEmail}. Replies come from {contact.supportEmail}. Both addresses reach the same person. Please give us a reasonable chance to fix an issue before disclosing it publicly. Do not access, modify or retain another user’s data while testing, and do not run disruptive tests against the live service. No bounty is offered, but genuine reports are welcome and credited on request.</p></Section>
    <Section title="3D model attribution"><p>The 3D avatar and pedestal models were generated with <ExternalLink href="https://www.tripo3d.ai/" className="text-accent underline">Tripo 3D</ExternalLink> and are used under <ExternalLink href="https://creativecommons.org/licenses/by/4.0/" className="text-accent underline">CC BY 4.0</ExternalLink>. They were modified for this application through mesh separation, transforms, materials, shaders and rendering integration. Tripo does not endorse this project.</p></Section>
  </LegalPage>;
}
