import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/useUiStore";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-[12px] font-medium text-ink">{title}</h3>
      <div className="text-[11.5px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function HelpDialog() {
  const open = useUiStore((state) => state.helpOpen);
  const setOpen = useUiStore((state) => state.setHelpOpen);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Exploring in three dimensions"
      description="A practical guide to the comparison, the controls, and the limits of this workspace."
      footer={
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Close guide
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-sm border border-border bg-surface-2 p-3">
          <p className="editorial text-[15px] leading-snug text-ink">
            Does viewing this dataset in three dimensions help you discover relationships that are harder to see in two
            dimensions?
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            Not inherently. 3D adds a third variable and spatial depth, but it also adds occlusion and perspective
            distortion. The 2D view is often better for precise reading and comparison; 3D is useful for spotting
            clusters, gradients, and three-way structure. Switch freely and judge per task.
          </p>
        </div>

        <Section title="Navigating the 3D scene">
          <ul className="list-disc space-y-1 pl-4">
            <li>Drag to orbit. Scroll or pinch to zoom. Right-drag or two-finger drag to pan.</li>
            <li>Click a point to select it. Click empty space or press Escape to clear the selection.</li>
            <li>Use the camera button to return to the default angle. Press R when the plot is focused.</li>
            <li>The orientation gizmo in the bottom-right shows the current axis directions.</li>
            <li>Every rendered point corresponds to a real dataset row. Missing axis values hide that row and are counted under the plot.</li>
          </ul>
        </Section>

        <Section title="Reading the encodings">
          <ul className="list-disc space-y-1 pl-4">
            <li>Each mapped axis uses an independent linear min–max scale over the full dataset, mapped to [-1, 1]. Constant columns collapse to the center.</li>
            <li>Color can be categorical (stable palette, top 11 values plus “Other”) or numeric (viridis scale). Missing values use a neutral gray.</li>
            <li>Size encodes a numeric variable with a linear radius multiplier. Use it sparingly; it can imply volume in 3D.</li>
            <li>Selection uses a larger marker and a ring in both views, never color alone.</li>
          </ul>
        </Section>

        <Section title="Comparing views">
          <ul className="list-disc space-y-1 pl-4">
            <li>Choose “Compare” for linked 3D and 2D views. Both use the same filtered rows, color mapping, and selection.</li>
            <li>The 2D axes are independent of the 3D Z axis. Map them in the Configure panel.</li>
            <li>Use the 2D view for exact values on hover and for unambiguous ordering. Use 3D to inspect whether a third variable separates groups.</li>
            <li>Filters, statistics, the table, and CSV export always use the full filtered subset — not the sampled rendered points.</li>
          </ul>
        </Section>

        <Section title="Keyboard and accessibility">
          <ul className="list-disc space-y-1 pl-4">
            <li>All controls are reachable by keyboard with visible focus rings.</li>
            <li>The dataset table rows are focusable; press Enter or Space to inspect a record.</li>
            <li>The 2D view is fully usable without WebGL and exposes hover values plus a selectable table alternative.</li>
            <li>Reduced-motion preferences disable interface transitions.</li>
          </ul>
        </Section>

        <Section title="Limits and privacy">
          <ul className="list-disc space-y-1 pl-4">
            <li>Files are parsed and plotted entirely in this browser tab. Nothing is uploaded.</li>
            <li>Maximum import: 25 MB or 100,000 rows. 3D rendering is capped at 20,000 sampled points; 2D at 4,000.</li>
            <li>Statistics, filtering, selection, and export use every filtered row, regardless of the render cap.</li>
            <li>Theme preference is stored in localStorage. Datasets are not persisted.</li>
          </ul>
        </Section>
      </div>
    </Dialog>
  );
}
