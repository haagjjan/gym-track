"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "../../../../../web/src/features/shell/app-shell";
import { TemplatesScreen } from "../../../../../web/src/features/templates/templates-screen";
import { Authed } from "../../../session/session";

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function Templates(): ReactNode {
  const query = useSearchParams();
  const template = query.get("template");
  const initialTemplateId = template && UUID_PATTERN.test(template) ? template : undefined;

  return (
    <Authed>
      {(user) => (
        <AppShell user={user}>
          <TemplatesScreen
            initialTemplateId={initialTemplateId}
            key={initialTemplateId ?? "list"}
            userId={user.id}
          />
        </AppShell>
      )}
    </Authed>
  );
}

export default function TemplatesPage(): ReactNode {
  return <Suspense fallback={null}><Templates /></Suspense>;
}
