"use client";

import { Fragment, useState } from "react";
import { useI18n } from "@/i18n";
import { ForceDiagram } from "./ForceDiagram";
import { FormulaBlock } from "./FormulaBlock";
import { TrussVisualizer } from "./TrussVisualizer";
import { SYColorKey } from "./SYColorKey";
import { ArcLoadDiagram, TriangleLoadDiagram } from "./StructuralForms";
import { researchT, type ResearchKey } from "./i18n";

/** Renders `**bold**` spans so translators can place emphasis themselves. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-medium text-on-surface">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h1 className="type-headline-s mb-4 text-on-surface">{children}</h1>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="type-body-m mb-3 text-on-surface-variant">{children}</p>;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="elevation-1 mb-4 rounded-md border border-outline-variant bg-surface-container-lowest p-6">
      {children}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="type-title-m mt-4 mb-2 text-on-surface">{children}</h2>;
}

function WorksheetShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-md border-2 border-dashed border-primary/40 bg-primary-container/40 p-6">
      <div className="type-label-m mb-3 uppercase text-primary">✏️ {label}</div>
      {children}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="type-label-m flex flex-col gap-1 text-on-surface-variant">
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="type-body-m w-32 rounded-xs border border-outline bg-surface-container-lowest px-2 py-1.5 font-mono text-on-surface outline-none focus:border-primary"
      />
    </label>
  );
}

function Readout({ children }: { children: React.ReactNode }) {
  return (
    <div className="type-body-m flex flex-col gap-1 rounded-sm border border-outline-variant bg-surface-container-lowest p-4 font-mono tabular-nums text-on-surface">
      {children}
    </div>
  );
}

type T = ReturnType<typeof researchT>;

function WorksheetTrussStability({ t }: { t: T }) {
  const [joints, setJoints] = useState(4);
  const [members, setMembers] = useState(5);
  const [reactions, setReactions] = useState(3);

  const lhs = members + reactions;
  const rhs = 2 * joints;
  const determinate = lhs === rhs;
  const verdict = determinate
    ? t("ws.determinate")
    : lhs > rhs
      ? t("ws.indeterminate")
      : t("ws.unstable");
  const verdictTone = determinate ? "text-safe" : lhs > rhs ? "text-caution" : "text-error";

  return (
    <WorksheetShell label={t("worksheet.label")}>
      <P>
        <Rich text={t("ws.stabilityIntro")} />
      </P>
      <div className="mb-4 flex flex-wrap gap-4">
        <NumberInput label={t("ws.joints")} value={joints} onChange={setJoints} />
        <NumberInput label={t("ws.members")} value={members} onChange={setMembers} />
        <NumberInput label={t("ws.reactions")} value={reactions} onChange={setReactions} />
      </div>
      <Readout>
        <span>
          m + r = {members} + {reactions} = {lhs} &nbsp;|&nbsp; 2j = 2 × {joints} = {rhs}
        </span>
      </Readout>
      <div className={`type-title-s mt-3 ${verdictTone}`}>{verdict}</div>
      {determinate && <P>{t("ws.solvable")}</P>}
    </WorksheetShell>
  );
}

function WorksheetLinearForces({ t }: { t: T }) {
  const [force, setForce] = useState(100);
  const [angle, setAngle] = useState(30);
  const rad = (angle * Math.PI) / 180;
  const fx = force * Math.cos(rad);
  const fy = force * Math.sin(rad);

  return (
    <WorksheetShell label={t("worksheet.label")}>
      <P>
        <Rich text={t("ws.linearIntro")} />
      </P>
      <div className="mb-4 flex flex-wrap gap-4">
        <NumberInput label={t("ws.force")} value={force} onChange={setForce} />
        <NumberInput label={t("ws.angle")} value={angle} onChange={setAngle} />
      </div>
      <Readout>
        <span>
          Fx = {force} × cos({angle}°) = {fx.toFixed(2)} N
        </span>
        <span>
          Fy = {force} × sin({angle}°) = {fy.toFixed(2)} N
        </span>
      </Readout>
    </WorksheetShell>
  );
}

function WorksheetExternalForces({ t }: { t: T }) {
  const [span, setSpan] = useState(10);
  const [loadPos, setLoadPos] = useState(4);
  const [force, setForce] = useState(500);

  const a = Math.min(Math.max(loadPos, 0), span);
  const r1 = (force * (span - a)) / span;
  const r2 = (force * a) / span;

  return (
    <WorksheetShell label={t("worksheet.label")}>
      <P>
        <Rich text={t("ws.externalIntro")} />
      </P>
      <div className="mb-4 flex flex-wrap gap-4">
        <NumberInput label={t("ws.span")} value={span} onChange={setSpan} />
        <NumberInput label={t("ws.loadPos")} value={loadPos} onChange={setLoadPos} />
        <NumberInput label={t("ws.force")} value={force} onChange={setForce} />
      </div>
      <Readout>
        <span>
          R1 = {force} × ({span} − {a}) / {span} = {r1.toFixed(2)} N
        </span>
        <span>
          R2 = {force} × {a} / {span} = {r2.toFixed(2)} N
        </span>
        <span className="text-on-surface-variant">
          {t("ws.check", { sum: (r1 + r2).toFixed(2) })}
        </span>
      </Readout>
    </WorksheetShell>
  );
}

/** A chip row — used for the design-process and design-loop step lists. */
function StepChips({ labels, tone }: { labels: string[]; tone: "primary" | "neutral" }) {
  const styles =
    tone === "primary"
      ? "bg-primary-container text-on-primary-container"
      : "border border-outline-variant bg-surface-container text-on-surface-variant";
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {labels.map((label) => (
        <span key={label} className={`type-label-l rounded-full px-4 py-1.5 ${styles}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

export function ResearchContent({ sectionId }: { sectionId: string }) {
  const { lang } = useI18n();
  const t = researchT(lang);
  const heading = (key: ResearchKey) => <SectionHeading>{t(key)}</SectionHeading>;

  switch (sectionId) {
    case "design-process":
      return (
        <div>
          {heading("sec.designProcess")}
          <Card>
            <P>{t("designProcess.p1")}</P>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {(["designProcess.s1", "designProcess.s2", "designProcess.s3", "designProcess.s4", "designProcess.s5", "designProcess.s6"] as const).map(
                (key, i) => (
                  <div
                    key={key}
                    className="rounded-sm bg-primary-container p-3 text-center text-on-primary-container"
                  >
                    <div className="type-label-m mb-1 opacity-70">{i + 1}</div>
                    <div className="type-title-s">{t(key)}</div>
                  </div>
                ),
              )}
            </div>
          </Card>
        </div>
      );

    case "design-challenge":
      return (
        <div>
          {heading("sec.designChallenge")}
          <Card>
            <P>
              <Rich text={t("designChallenge.p1")} />
            </P>
            <P>{t("designChallenge.p2")}</P>
          </Card>
        </div>
      );

    case "background":
      return (
        <div>
          {heading("sec.background")}
          <Card>
            <P>{t("background.p1")}</P>
            <P>{t("background.p2")}</P>
          </Card>
        </div>
      );

    case "truss-systems":
      return (
        <div>
          {heading("sec.trussSystems")}
          <Card>
            <P>{t("trussSystems.p1")}</P>
            <SubHeading>{t("trussSystems.h2Types")}</SubHeading>
            <P>{t("trussSystems.p2")}</P>
            <ForceDiagram />
          </Card>
          <Card>
            <SubHeading>{t("trussSystems.h2Forms")}</SubHeading>
            <P>{t("trussSystems.p3")}</P>
            <div className="my-4 flex flex-wrap justify-center gap-8">
              <ArcLoadDiagram />
            </div>
            <P>{t("trussSystems.p4")}</P>
            <div className="my-4 flex flex-wrap justify-center gap-8">
              <TriangleLoadDiagram />
            </div>
            <P>{t("trussSystems.p5")}</P>
          </Card>
          <Card>
            <SubHeading>{t("trussSystems.h2Stability")}</SubHeading>
            <P>
              <Rich text={t("trussSystems.p6")} />
            </P>
          </Card>
        </div>
      );

    case "worksheet-truss-stability":
      return (
        <div>
          {heading("sec.wsTrussStability")}
          <Card>
            <P>
              <Rich text={t("wsTrussStability.p1")} />
            </P>
          </Card>
          <WorksheetTrussStability t={t} />
        </div>
      );

    case "forces-on-truss":
      return (
        <div>
          {heading("sec.forcesOnTruss")}
          <Card>
            <P>
              <Rich text={t("forcesOnTruss.p1")} />
            </P>
            <ForceDiagram />
          </Card>
        </div>
      );

    case "worksheet-linear-forces":
      return (
        <div>
          {heading("sec.wsLinearForces")}
          <Card>
            <P>{t("wsLinearForces.p1")}</P>
          </Card>
          <WorksheetLinearForces t={t} />
        </div>
      );

    case "external-forces":
      return (
        <div>
          {heading("sec.externalForces")}
          <Card>
            <P>{t("externalForces.p1")}</P>
            <P>{t("externalForces.p2")}</P>
          </Card>
        </div>
      );

    case "worksheet-external-forces":
      return (
        <div>
          {heading("sec.wsExternalForces")}
          <Card>
            <P>{t("wsExternalForces.p1")}</P>
          </Card>
          <WorksheetExternalForces t={t} />
        </div>
      );

    case "internal-forces":
      return (
        <div>
          {heading("sec.internalForces")}
          <Card>
            <P>
              <Rich text={t("internalForces.p1")} />
            </P>
            <P>{t("internalForces.p2")}</P>
          </Card>
        </div>
      );

    case "stress-yield":
      return (
        <div>
          {heading("sec.stressYield")}
          <Card>
            <P>{t("stressYield.p1")}</P>
            <FormulaBlock formula={t("stressYield.formula")} />
            <P>{t("stressYield.exampleLead")}</P>
            <FormulaBlock
              title={t("stressYield.exampleTitle")}
              formula={"A = 0.00001 m²\nForce = 73.72 N\nStress = 73.72 / 0.00001 = 7,372,000 Pa"}
            />
            <P>{t("stressYield.p2")}</P>
            <FormulaBlock
              title={t("stressYield.safetyTitle")}
              formula="S/Y = Stress / Yield Strength"
              note={t("stressYield.safetyNote")}
            />
          </Card>
          <Card>
            <P>{t("stressYield.p3")}</P>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_auto]">
              <TrussVisualizer />
              <div className="lg:pt-2">
                <SYColorKey />
              </div>
            </div>
            <P>
              <Rich text={t("stressYield.p4")} />
            </P>
          </Card>
          <Card>
            <SubHeading>{t("stressYield.h2Loop")}</SubHeading>
            <P>{t("stressYield.p5")}</P>
            <StepChips
              tone="neutral"
              labels={(["stressYield.l1", "stressYield.l2", "stressYield.l3", "stressYield.l4", "stressYield.l5", "stressYield.l6"] as const).map(
                (k) => t(k),
              )}
            />
          </Card>
        </div>
      );

    default:
      return (
        <div>
          {heading("notFound.title")}
          <P>{t("notFound.body")}</P>
        </div>
      );
  }
}
