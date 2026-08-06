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

export function IconPlus(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="M10 4v12M4 10h12" />
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

export function IconLogout(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="M8 3H4v14h4M13 6l4 4-4 4M17 10H8" />
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

export function IconCheck(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <Icon {...props}>
      <path d="m4 10.5 4 4 8-9" />
    </Icon>
  );
}
