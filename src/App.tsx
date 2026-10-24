import { useDatasetView } from "@/hooks/useDatasetView";
import { useDataStore } from "@/store/useDataStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Onboarding } from "@/components/layout/Onboarding";
import { Workspace } from "@/components/layout/Workspace";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { ImportDialog } from "@/components/dialogs/ImportDialog";
import { Toast } from "@/components/layout/Toast";

export default function App() {
  const dataset = useDataStore((state) => state.dataset);
  const view = useDatasetView();

  return (
    <TooltipProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2 focus:text-[12px] focus:text-ink focus:shadow-panel"
      >
        Skip to main content
      </a>
      {dataset ? <Workspace view={view} /> : <Onboarding />}
      <HelpDialog />
      <ImportDialog />
      <Toast />
    </TooltipProvider>
  );
}
