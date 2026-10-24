import { Box, SlidersHorizontal, Table2 } from "lucide-react";
import type { DatasetView } from "@/hooks/useDatasetView";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { WorkspaceStage } from "@/components/workspace/WorkspaceStage";
import { Inspector } from "@/components/inspector/Inspector";
import { DataPanel } from "@/components/data/DataPanel";
import { DatasetNotice } from "@/components/data/DatasetNotice";
import { SegmentedControl } from "@/components/ui/badge";
import { useUiStore, type MobilePanel } from "@/store/useUiStore";
import { cn } from "@/lib/utils";

export function Workspace({ view }: { view: DatasetView }) {
  const mobilePanel = useUiStore((state) => state.mobilePanel);
  const setMobilePanel = useUiStore((state) => state.setMobilePanel);
  const dataPanelOpen = useUiStore((state) => state.dataPanelOpen);
  const setDataPanelOpen = useUiStore((state) => state.setDataPanelOpen);

  const selectPanel = (panel: MobilePanel) => {
    setMobilePanel(panel);
    if (panel === "data") setDataPanelOpen(true);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <Sidebar view={view} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar view={view} />
        <DatasetNotice view={view} />

        <main
          id="main-content"
          className="min-h-0 flex-1 overflow-y-auto p-2 lg:flex lg:flex-col lg:overflow-hidden lg:p-3"
        >
          <div className="mb-2 shrink-0 lg:hidden">
            <SegmentedControl
              label="Workspace panel"
              value={mobilePanel}
              onChange={selectPanel}
              options={[
                { value: "viz", label: "Visualize", icon: <Box size={12} /> },
                { value: "config", label: "Configure", icon: <SlidersHorizontal size={12} /> },
                { value: "data", label: "Data", icon: <Table2 size={12} /> },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2 lg:min-h-0 lg:flex-1 lg:flex-row">
            <div
              className={cn(
                "flex min-h-[560px] flex-col lg:min-h-0 lg:flex-1",
                mobilePanel !== "viz" && "hidden lg:flex",
              )}
            >
              <WorkspaceStage view={view} />
            </div>
            <div
              className={cn(
                "flex min-h-[540px] flex-col lg:min-h-0 lg:w-[344px] lg:shrink-0",
                mobilePanel !== "config" && "hidden lg:flex",
              )}
            >
              <Inspector view={view} />
            </div>
          </div>

          <div
            className={cn(
              "mt-2 shrink-0 overflow-hidden rounded-md border border-border bg-surface shadow-panel transition-[height] duration-200",
              mobilePanel !== "data" && "hidden lg:block",
              dataPanelOpen ? "h-[460px] lg:h-[clamp(220px,30vh,280px)]" : "h-11",
            )}
          >
            <DataPanel view={view} />
          </div>
        </main>
      </div>
    </div>
  );
}
