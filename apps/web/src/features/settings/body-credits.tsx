import type { ReactNode } from "react";

export function BodyCredits(): ReactNode {
  return (
    <div className="space-y-3 text-body text-text-secondary">
      <h3 className="text-headline text-text">Body model</h3>
      <p>BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.</p>
      <p>The figure is adapted for GymTrack: grouped muscles, simplified anterior shoulders, adjusted shapes, added surfaces, a skeleton and reduced geometry.</p>
      <p><a className="text-accent underline" href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html">BodyParts3D source and credit</a></p>
      <p><a className="text-accent underline" href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 licence</a></p>
    </div>
  );
}
