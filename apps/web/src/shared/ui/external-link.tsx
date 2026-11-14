"use client";

import type { MouseEvent, ReactNode } from "react";
import { getNativeBridge } from "../platform/native";

export interface ExternalLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}

/**
 * External link that opens via the native shell's system browser sheet when
 * running inside the mobile app, and falls back to a standard `target="_blank"`
 * anchor on the web.
 */
export function ExternalLink({ href, children, ...rest }: ExternalLinkProps): ReactNode {
  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    const bridge = getNativeBridge();
    if (!bridge) return;
    event.preventDefault();
    void bridge.openExternal(href);
  }

  return (
    <a href={href} onClick={handleClick} rel="noreferrer" target="_blank" {...rest}>
      {children}
    </a>
  );
}
