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
      title="Exploring the multiview workspace"
      description="A practical guide to the views, linked state, layouts, and limits of this workspace."
      footer={
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Close guide
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-sm border border-border bg-surface-2 p-3">
          <p className="editorial text-[15px] leading-snug text-ink">
            Does viewing this dataset in three dimensions reveal relationships that are harder to see in two?
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            Not inherently. 3D adds a third variable and spatial depth, but it also adds occlusion and perspective
            distortion. The conventional 2D views are the primary workspace; 3D is one option among several. Switch
            freely and judge per task.
          </p>
        </div>

        <Section title="Opening and arranging views">
          <ul className="list-disc space-y-1 pl-4">
            <li>Choose <strong>Add view</strong> to browse the gallery. Unavailable views state the required fields and suggest a compatible alternative.</li>
            <li>Up to eight views can be open. Use <strong>Single</strong>, <strong>Columns</strong>, or <strong>Grid</strong> to change the arrangement.</li>
            <li>Each panel can be maximized, restored, reordered, or closed. Closing every view keeps the dataset loaded.</li>
            <li>The active panel is outlined. Its mappings and options appear in the Configure panel.</li>
          </ul>
        </Section>

        <Section title="Linked state: filters, selection, and color">
          <ul className="list-disc space-y-1 pl-4">
            <li>Shared filters apply to every view, the count, statistics, and CSV export. Missing values never become zero.</li>
            <li>Clicking a point or row selects a record everywhere it can be shown. Checkboxes in the table add records to the shared multi-selection.</li>
            <li>A selection is not cleared when a filter hides it. The banner reports hidden selected records and offers to clear the filter or the selection.</li>
            <li>Histogram bars apply range filters, not record selection. Parallel-coordinate brushing can select or filter the matching records.</li>
            <li>Category colors come from one shared mapping, including a neutral color for missing categories.</li>
          </ul>
        </Section>

        <Section title="Time series, correlation, and brushing">
          <ul className="list-disc space-y-1 pl-4">
            <li>The time-series view needs one date/timestamp field and one numeric measure. It does not bucket or average timestamps. Points with duplicate timestamps stay separate, and their connecting line is omitted.</li>
            <li>Time-range controls and shared time filters use inclusive bounds. Invalid dates and missing measures are counted separately.</li>
            <li>The correlation heatmap uses Pearson correlation over pairwise-complete observations. A blank cell means the pair had too few values or no variation; it is not zero. Large datasets use a deterministic sample of up to 2,000 rows for the calculation.</li>
            <li>Parallel-coordinate axes are min–max normalized from the full dataset. Brushing uses original units. Lines are sampled for drawing, but brushing and selection use every complete filtered record.</li>
          </ul>
        </Section>

        <Section title="The 3D scene">
          <ul className="list-disc space-y-1 pl-4">
            <li>Drag to orbit. Scroll or pinch to zoom. Right-drag or two-finger drag to pan.</li>
            <li>Click a point to select it. Click empty space or press Escape to clear the selection.</li>
            <li>Use the camera button to return to the default angle. Press R when the plot is focused.</li>
            <li>Every rendered point corresponds to a real dataset row. Rows with missing mapped values are not plotted and are counted below the plot.</li>
          </ul>
        </Section>

        <Section title="Saving and restoring a workspace">
          <ul className="list-disc space-y-1 pl-4">
            <li>Save a version 2 workspace JSON containing open views, layout, mappings, shared color/filters, time ranges, and view options. The dataset itself is not embedded.</li>
            <li>Import validates the version, types, fields, and options before changing anything. Unknown view types are dropped with a warning, and version 1 configuration files are upgraded.</li>
            <li>The workspace arrangement and encodings are remembered locally for the matching dataset signature. Uploaded datasets are never persisted.</li>
          </ul>
        </Section>

        <Section title="Experimental spatial mode">
          <ul className="list-disc space-y-1 pl-4">
            <li>The orbit button opens a clearly labelled experimental Three.js workspace with panel cards placed in a navigable scene.</li>
            <li>Live previews are non-interactive. 3D scatter opens in the standard workspace. Performance at higher view counts has not been verified.</li>
            <li>Use <strong>Standard workspace</strong> to return. This mode is optional and not required for any analysis.</li>
          </ul>
        </Section>

        <Section title="Keyboard, accessibility, and limits">
          <ul className="list-disc space-y-1 pl-4">
            <li>Controls have visible focus rings. Inputs and selects keep normal keyboard behavior.</li>
            <li>Escape clears the shared selection when focus is not inside a text field.</li>
            <li>The 2D views are a complete alternative when WebGL is unavailable or difficult to use.</li>
            <li>Maximum import: 25 MB or 100,000 rows. Rendering is capped at 20,000 points in 3D and 4,000 in 2D; statistics, filtering, selection, and export use every filtered row.</li>
            <li>Files are parsed and plotted entirely in this browser tab. Theme and workspace layout are stored locally; datasets are not.</li>
          </ul>
        </Section>
      </div>
    </Dialog>
  );
}
