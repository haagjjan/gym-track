import type { ReactNode, SVGProps } from "react";

function Icon({
  children,
  ...props
}: SVGProps<SVGSVGElement> & { children: ReactNode }): ReactNode {
  return (
    <svg
      aria-hidden
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.5"
      viewBox="0 0 20 20"
      width="18"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconPlus(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="M10 4v12M4 10h12" />
    </Icon>
  );
}

export function IconLogout(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="M8 3H4v14h4M13 6l4 4-4 4M17 10H8" />
    </Icon>
  );
}

export function IconClose(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="m5 5 10 10M15 5 5 15" />
    </Icon>
  );
}

export function IconMinus(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="M4 10h12" />
    </Icon>
  );
}

function Icon24({
  children,
  ...props
}: SVGProps<SVGSVGElement> & { children: ReactNode }): ReactNode {
  return (
    <svg
      aria-hidden
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width="24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconHome(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 {...props}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></Icon24>;
}

export function IconClock(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 {...props}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></Icon24>;
}

export function IconDumbbell(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 strokeWidth="2" {...props}><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></Icon24>;
}

export function IconTrend(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 {...props}><path d="M4 18 9.5 12l3.5 3.5L20 8" /><path d="M15 8h5v5" /></Icon24>;
}

export function IconFigure(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 {...props}><circle cx="12" cy="5.5" r="2" /><path d="M8 9.5h8M12 9.5v5M9.5 21l2.5-6.5L14.5 21" /></Icon24>;
}

export function IconInbox(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 {...props}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3h.5A2.5 2.5 0 0 1 4 14.5z" /></Icon24>;
}

export function IconSettings(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon24 {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon24>
  );
}

export function IconBack(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 strokeWidth="2" {...props}><path d="m15 5-7 7 7 7" /></Icon24>;
}

export function IconForward(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 strokeWidth="2" {...props}><path d="m9 6 6 6-6 6" /></Icon24>;
}

export function IconSignOut(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 {...props}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" /></Icon24>;
}

export function IconAdmin(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 {...props}><path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" /></Icon24>;
}

export function IconHelp(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 {...props}><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7M12 17h.01" /></Icon24>;
}

export function IconChevronDown(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 strokeWidth="2" {...props}><path d="m6 9 6 6 6-6" /></Icon24>;
}

export function IconMore(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 strokeWidth="2.5" {...props}><path d="M6 12h.01M12 12h.01M18 12h.01" /></Icon24>;
}

export function IconCheck24(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 strokeWidth="2" {...props}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon24>;
}

export function IconPlus24(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 strokeWidth="2" {...props}><path d="M12 5v14M5 12h14" /></Icon24>;
}

export function IconMinus24(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 strokeWidth="2" {...props}><path d="M5 12h14" /></Icon24>;
}

export function IconAlert(props: SVGProps<SVGSVGElement>): ReactNode {
  return <Icon24 {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.5M12 16h.01" /></Icon24>;
}

export function IconGrid(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <rect height="6" width="6" x="3" y="3" />
      <rect height="6" width="6" x="11" y="3" />
      <rect height="6" width="6" x="3" y="11" />
      <rect height="6" width="6" x="11" y="11" />
    </Icon>
  );
}

export function IconHistory(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l3 2" />
    </Icon>
  );
}

export function IconChart(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="M3 16.5 8 11l3 3 6-7" />
      <path d="M13 7h4v4" />
    </Icon>
  );
}

export function IconVolume(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 3v7l5 5" />
    </Icon>
  );
}

export function IconGear(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="3" />
      <path d="M8.5 2.5h3l.4 2a6 6 0 0 1 1.2.7l1.9-.6 1.5 2.6-1.5 1.3a6 6 0 0 1 0 1.4l1.5 1.3-1.5 2.6-1.9-.6a6 6 0 0 1-1.2.7l-.4 2h-3l-.4-2a6 6 0 0 1-1.2-.7l-1.9.6-1.5-2.6L5 9.9a6 6 0 0 1 0-1.4L3.5 7.2 5 4.6l1.9.6a6 6 0 0 1 1.2-.7l.4-2Z" />
    </Icon>
  );
}

export function IconBolt(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="M11 2 4 11h5l-1 7 8-10h-5l1-6Z" />
    </Icon>
  );
}

export function IconBarbell(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <rect height="8" width="2.5" x="3" y="6" />
      <rect height="8" width="2.5" x="14.5" y="6" />
      <path d="M5.5 10h9M1 8v4M19 8v4" />
    </Icon>
  );
}

export function IconChevronRight(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="m7 4 6 6-6 6" />
    </Icon>
  );
}

export function IconCheck(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="m4 10.5 4 4 8-9" />
    </Icon>
  );
}

export function IconMail(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <rect height="11" width="15" x="2.5" y="4.5" />
      <path d="M2.5 5.5 10 11l7.5-5.5" />
    </Icon>
  );
}

export function IconShield(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="M10 2.5 16 5v4.5c0 3.6-2.4 6.6-6 8-3.6-1.4-6-4.4-6-8V5z" />
      <path d="M7.5 10 9.5 12l3.5-3.5" />
    </Icon>
  );
}
