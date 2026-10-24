import { create } from "zustand";

export type InspectorTab = "style" | "filters" | "record";
export type MobilePanel = "viz" | "config" | "data";
export type DataTab = "preview" | "columns" | "summary";

interface UiState {
  inspectorTab: InspectorTab;
  setInspectorTab: (tab: InspectorTab) => void;
  dataPanelOpen: boolean;
  setDataPanelOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  importOpen: boolean;
  setImportOpen: (open: boolean) => void;
  mobilePanel: MobilePanel;
  setMobilePanel: (panel: MobilePanel) => void;
  /** Row to reveal in the dataset table (set by "Reveal in table"). */
  focusRowId: number | null;
  setFocusRowId: (id: number | null) => void;
  dataTab: DataTab;
  setDataTab: (tab: DataTab) => void;
}

export const useUiStore = create<UiState>((set) => ({
  inspectorTab: "style",
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  dataPanelOpen: true,
  setDataPanelOpen: (dataPanelOpen) => set({ dataPanelOpen }),
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  importOpen: false,
  setImportOpen: (importOpen) => set({ importOpen }),
  mobilePanel: "viz",
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  focusRowId: null,
  setFocusRowId: (focusRowId) => set({ focusRowId }),
  dataTab: "preview",
  setDataTab: (dataTab) => set({ dataTab }),
}));

export function resetUiStore(): void {
  useUiStore.setState({
    inspectorTab: "style",
    dataPanelOpen: true,
    helpOpen: false,
    importOpen: false,
    mobilePanel: "viz",
    focusRowId: null,
    dataTab: "preview",
  });
}
