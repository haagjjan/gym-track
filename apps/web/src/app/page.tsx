import type { ReactNode } from "react";

const sections = ["Session", "History", "Progress", "Volume"];

export default function HomePage(): ReactNode {
  return (
    <main className="appShell">
      <section className="summaryPanel" aria-labelledby="page-title">
        <p className="eyebrow">Prototype</p>
        <h1 id="page-title">Gym Progress Tracker</h1>
        <div className="sectionGrid" aria-label="Primary areas">
          {sections.map((section) => (
            <span key={section}>{section}</span>
          ))}
        </div>
      </section>
    </main>
  );
}
