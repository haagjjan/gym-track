import type { ReactNode } from "react";
import { LegalPage, Section, legalContacts } from "../../features/legal/legal-page";

export const metadata = { title: "Terms of Use" };

// See legal-page.tsx: contact details are read from server environment per
// request, so this route must not be statically prerendered.
export const dynamic = "force-dynamic";

export default function TermsPage(): ReactNode {
  const contact = legalContacts();
  return <LegalPage eyebrow="FOUNDING_BETA_RULES" title="Terms of Use">
    <Section title="Eligibility and beta access"><p>You must be at least 18 and resident in Switzerland. The Founding Beta is offered only in Switzerland and is governed by Swiss law. Founding Beta access is invitation-only and capped at 50 reserved/active seats. Approved access has no scheduled expiry, but the operator may suspend access for security, abuse, legal requirements, or material breach.</p></Section>
    <Section title="Early product"><p>This is an evolving public beta provided on a best-effort basis. Maintenance, defects, feature changes and service interruptions may occur. No contractual availability guarantee or training outcome is promised.</p></Section>
    <Section title="Not medical advice"><p>The service records information you enter and provides calculations for personal training review. It does not diagnose, treat or prevent injury or disease and is not a substitute for professional medical or coaching advice.</p><p>Every figure shown — including estimated one-rep maxima, training volume and progress trends — is a calculation derived from sets you have already recorded. It describes what you did; it is not a target, a prescription, or a recommendation to attempt any particular lift. Decide what is safe for you to lift with your own judgement, and seek qualified advice where appropriate.</p></Section>
    <Section title="Acceptable use"><p>Do not attack, automate abuse, probe other accounts, upload unlawful/offensive material, misuse invitations, interfere with availability, or attempt to bypass access, rate, or ownership controls. Keep credentials and invitations private.</p></Section>
    <Section title="Shared exercise contributions"><p>A custom exercise can be used by other members. If you delete your account, unreferenced custom exercises are removed; definitions referenced by others may remain after creator identity is removed.</p></Section>
    <Section title="Data and termination"><p>You may export and schedule deletion from Settings. Deletion has a seven-day cancellation period and is permanent afterward. The operator may terminate the beta or an account subject to applicable law and the published Privacy Notice.</p></Section>
    <Section title="Support"><p>Support is best effort through {contact.supportEmail}. Never send passwords, session cookies, invitation tokens, or password-reset links.</p></Section>
  </LegalPage>;
}
