import { ArrowRight, CircleHelp, Database, Layers, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/layout/Brand";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/useUiStore";

function DecorativeScatter() {
  const points = [
    [18, 62, 3.2],
    [28, 48, 2.1],
    [34, 70, 4.4],
    [43, 36, 2.6],
    [52, 55, 5.2],
    [58, 28, 3.1],
    [66, 47, 2.4],
    [72, 64, 4.8],
    [82, 34, 3.6],
    [88, 52, 2.2],
    [24, 78, 2.8],
    [47, 82, 3.4],
    [63, 76, 2.5],
    [77, 18, 4.1],
    [39, 24, 3.9],
    [15, 38, 2.3],
    [57, 88, 2.7],
    [91, 74, 3.3],
  ];
  return (
    <figure className="relative mt-8 overflow-hidden rounded-md border border-border bg-surface-2/60 p-4">
      <svg viewBox="0 0 100 100" className="h-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id="demo-fade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ds-accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--ds-accent)" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <g stroke="var(--ds-border-strong)" strokeWidth="0.3" opacity="0.65">
          <line x1="10" y1="88" x2="93" y2="88" />
          <line x1="10" y1="88" x2="10" y2="10" />
          <line x1="10" y1="88" x2="37" y2="73" />
          <line x1="93" y1="88" x2="93" y2="22" opacity="0.4" />
          <line x1="10" y1="10" x2="37" y2="4" opacity="0.4" />
          <line x1="37" y1="73" x2="93" y2="66" opacity="0.35" />
          <line x1="93" y1="22" x2="37" y2="4" opacity="0.35" />
        </g>
        <g fill="url(#demo-fade)" stroke="var(--ds-accent)" strokeWidth="0.35">
          {points.map(([x, y, r], index) => (
            <circle key={index} cx={x} cy={y} r={r} opacity={0.85} />
          ))}
        </g>
        <g fill="var(--ds-muted)" fontSize="3.2" fontFamily="var(--font-mono)">
          <text x="76" y="95">X</text>
          <text x="4" y="14">Y</text>
          <text x="27" y="68">Z</text>
        </g>
      </svg>
      <figcaption className="mt-1 text-[10px] uppercase tracking-[0.12em] text-faint">
        Decorative illustration · not a dataset
      </figcaption>
    </figure>
  );
}

export function Onboarding() {
  const setHelpOpen = useUiStore((state) => state.setHelpOpen);

  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Brand />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={14} /> Guide
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto grid w-full max-w-6xl gap-8 px-5 pb-14 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-12 lg:pt-12"
      >
        <section>
          <p className="mb-3 flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-accent">
            <span className="h-px w-6 bg-accent/50" aria-hidden />
            Browser-side exploration
          </p>
          <h1 className="editorial max-w-xl text-[clamp(2.4rem,5.4vw,4.1rem)] leading-[0.98] text-ink">
            See the shape of your data.
          </h1>
          <p className="mt-4 max-w-lg text-[13.5px] leading-relaxed text-muted">
            Map three variables into space, link a two-dimensional view, and ask a concrete question: does depth reveal
            structure that flat charts make hard to see? DataSpace keeps the comparison honest — every point is a row,
            and both views share the same filters and selection.
          </p>

          <ul className="mt-6 grid max-w-lg gap-3 sm:grid-cols-3">
            {[
              { icon: <Database size={14} />, title: "Your CSV", copy: "Strict parsing, inferred types, missing values kept visible." },
              { icon: <Layers size={14} />, title: "Linked views", copy: "3D and 2D share filters, color, and selection." },
              { icon: <ShieldCheck size={14} />, title: "Local only", copy: "No upload, no backend, no tracking." },
            ].map((item) => (
              <li key={item.title} className="rounded-sm border border-border bg-surface p-3">
                <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-[3px] bg-accent-soft text-accent">
                  {item.icon}
                </span>
                <p className="text-[11.5px] font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{item.copy}</p>
              </li>
            ))}
          </ul>

          <DecorativeScatter />
        </section>

        <section className="rounded-md border border-border bg-surface p-4 shadow-panel sm:p-5" aria-labelledby="import-heading">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 id="import-heading" className="editorial text-xl text-ink">
                Import a dataset
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted">
                Start with your own CSV, or explore the labelled synthetic demo.
              </p>
            </div>
            <span className="mono-num rounded-[3px] border border-border bg-surface-2 px-1.5 py-0.5 text-[9.5px] uppercase tracking-wider text-muted">
              CSV
            </span>
          </div>

          <UploadPanel />

          <div className="mt-4 border-t border-border pt-3">
            <h3 className="panel-title mb-2">What happens next</h3>
            <ol className="space-y-1.5">
              {[
                "Columns are typed as numeric, categorical, date-like, text, or empty.",
                "Numeric columns become axis, color, and size candidates.",
                "Axes are mapped automatically; every mapping stays editable.",
              ].map((step, index) => (
                <li key={step} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                  <span className="mono-num text-[10px] text-faint">{String(index + 1).padStart(2, "0")}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <Button variant="link" size="sm" className="mt-2 gap-1 text-[11px]" onClick={() => setHelpOpen(true)}>
              Read the exploration guide <ArrowRight size={11} />
            </Button>
          </div>

          <p className="mt-3 border-t border-border pt-3 text-[10px] leading-relaxed text-faint">
            The demo contains 720 synthetic air-quality stations generated deterministically. It is not real monitoring
            data and exercises the same pipeline as uploaded files.
          </p>
        </section>
      </main>
    </div>
  );
}
