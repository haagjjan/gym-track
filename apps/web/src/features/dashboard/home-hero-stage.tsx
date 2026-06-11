import type { ReactNode } from "react";
import type { AuthUser } from "../auth/auth-types";

interface HomeHeroStageProps {
  action: ReactNode;
  leftPanel: ReactNode;
  rightBottomPanel: ReactNode;
  rightTopPanel: ReactNode;
  statusLabel: string;
  statusValue: string;
  summary: string;
  title: string;
  user: AuthUser;
}

export function HomeHeroStage({
  action,
  leftPanel,
  rightBottomPanel,
  rightTopPanel,
  statusLabel,
  statusValue,
  summary,
  title,
  user
}: HomeHeroStageProps): ReactNode {
  return (
    <section className="homeHeroStage">
      <div className="homeHeroStage__copy">
        <p className="homeHeroStage__eyebrow">OPERATOR / BODY_COCKPIT_HOME</p>
        <h1 id="home-dashboard-title">{title}</h1>
        <p className="homeHeroStage__summary">{summary}</p>
        <dl className="homeHeroStage__meta">
          <div>
            <dt>OPERATOR</dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt>{statusLabel}</dt>
            <dd>{statusValue}</dd>
          </div>
        </dl>
      </div>

      <div className="homeHeroStage__left">{leftPanel}</div>

      <div className="homeHeroStage__reserve" aria-hidden="true" />

      <div className="homeHeroStage__rightTop">{rightTopPanel}</div>

      <div className="homeHeroStage__rightBottom">{rightBottomPanel}</div>

      <div className="homeHeroStage__action">{action}</div>
    </section>
  );
}
