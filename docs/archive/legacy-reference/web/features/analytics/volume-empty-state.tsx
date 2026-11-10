import type { ReactNode } from "react";

export function VolumeEmptyState({
  message,
  title
}: {
  message: string;
  title: string;
}): ReactNode {
  return (
    <div className="volumeEmptyState">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}
