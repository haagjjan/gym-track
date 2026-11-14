import type { ReactNode } from "react";
import { DemoPage } from "./demo-page";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ screen: string[] }> {
  return [
    { screen: [] },
    { screen: ["workout"] },
    { screen: ["session"] },
    { screen: ["history"] },
    { screen: ["progress"] },
    { screen: ["volume"] }
  ];
}

export default async function DemoRoutePage({
  params
}: {
  params: Promise<{ screen?: string[] }>;
}): Promise<ReactNode> {
  const { screen = [] } = await params;
  return <DemoPage page={screen[0] ?? "home"} />;
}
