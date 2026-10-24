import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";

export function ImportDialog() {
  const open = useUiStore((state) => state.importOpen);
  const setOpen = useUiStore((state) => state.setImportOpen);
  const dataset = useDataStore((state) => state.dataset);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title={dataset ? "Replace the current dataset" : "Import a dataset"}
      description={
        dataset
          ? "Importing a new file or loading the demo replaces the current dataset and resets its mappings and filters. Export anything you need first."
          : "Choose a CSV file or load the labelled synthetic demo."
      }
      footer={
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      }
    >
      <UploadPanel compact onImported={() => setOpen(false)} />
    </Dialog>
  );
}
