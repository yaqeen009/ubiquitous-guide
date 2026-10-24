import { useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Compass, ExternalLink, Plus, RotateCcw, X } from "lucide-react";
import type { DatasetView } from "@/hooks/useDatasetView";
import type { ViewInstance } from "@/types";
import { visualizationById } from "@/viz/registry";
import { viewLabel } from "@/workspace/persistence";
import { useDataStore } from "@/store/useDataStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function spatialPositions(count: number): Array<[number, number, number]> {
  const columns = Math.min(3, Math.max(1, count));
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = (column - (columns - 1) / 2) * 4.05;
    const y = 0.9 - row * 2.6;
    const z = -row * 0.35;
    return [x, y, z];
  });
}

function PanelCard({
  panel,
  view,
  position,
  active,
  onFocus,
}: {
  panel: ViewInstance;
  view: DatasetView;
  position: [number, number, number];
  active: boolean;
  onFocus: () => void;
}) {
  const theme = useDataStore((state) => state.theme);
  const definition = visualizationById(panel.type);
  if (!definition) return null;
  const Component = definition.component;
  const title = viewLabel(panel);
  const showLive = panel.type !== "scatter3d";

  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[3.45, 2.65]} />
        <meshBasicMaterial color={active ? "#63c9b8" : theme === "dark" ? "#2b2d26" : "#e2ded3"} transparent opacity={active ? 0.2 : 0.55} />
      </mesh>
      <Html transform distanceFactor={7.2} position={[0, 0, 0.03]} zIndexRange={[20, 0]}>
        <div
          className={`flex w-[330px] flex-col overflow-hidden rounded-md border bg-surface text-ink shadow-panel ${
            active ? "border-accent" : "border-border-strong"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">{title}</span>
            <Badge tone={active ? "accent" : "neutral"}>{definition.category}</Badge>
            <button
              type="button"
              className="rounded-sm p-0.5 text-muted hover:text-ink"
              onClick={onFocus}
              aria-label={`Open ${title} in the standard workspace`}
            >
              <ExternalLink size={12} />
            </button>
          </div>
          <div className={`relative h-[152px] overflow-hidden ${showLive ? "pointer-events-none" : ""}`} aria-hidden={showLive}>
            {showLive ? (
              <Component view={view} instance={panel} />
            ) : (
              <div className="surface-grid flex h-full flex-col items-center justify-center gap-1 text-center">
                <span className="text-[11px] font-medium text-ink-soft">3D scatter</span>
                <span className="max-w-48 text-[10px] leading-relaxed text-muted">
                  {[panel.fields.x, panel.fields.y, panel.fields.z].filter(Boolean).join(" × ") || "No axes mapped"}
                </span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface/30 to-transparent" />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1.5">
            <span className="truncate text-[10px] text-muted">{definition.shortName}</span>
            <Button variant="secondary" size="xs" onClick={onFocus}>
              Open <ExternalLink size={10} />
            </Button>
          </div>
        </div>
      </Html>
    </group>
  );
}

export function SpatialStage({
  panels,
  view,
  activePanelId,
  onExit,
  onFocus,
  onAdd,
}: {
  panels: ViewInstance[];
  view: DatasetView;
  activePanelId: string | null;
  onExit: () => void;
  onFocus: (id: string) => void;
  onAdd: () => void;
}) {
  const theme = useDataStore((state) => state.theme);
  const setSpatialMode = useWorkspaceStore((state) => state.setSpatialMode);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const positions = useMemo(() => spatialPositions(panels.length), [panels.length]);
  const [cameraToken, setCameraToken] = useState(0);

  const resetCamera = () => {
    controlsRef.current?.reset();
    setCameraToken((value) => value + 1);
  };

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-sm border border-border bg-bg" role="region" aria-label="Experimental spatial workspace">
      <div className="absolute inset-0" aria-hidden>
        <Canvas
          key={cameraToken}
          camera={{ position: [0, 0.6, 7.4], fov: 48 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          onPointerMissed={() => undefined}
        >
          <color attach="background" args={[theme === "dark" ? "#111210" : "#f3f1eb"]} />
          <ambientLight intensity={0.85} />
          <directionalLight position={[4, 6, 5]} intensity={0.7} />
          <gridHelper
            args={[24, 24, theme === "dark" ? "#3b3d33" : "#c9c4b7", theme === "dark" ? "#24251f" : "#ded9cd"]}
            position={[0, -1.5, 0]}
          />
          {panels.map((panel, index) => (
            <PanelCard
              key={panel.id}
              panel={panel}
              view={view}
              position={positions[index] ?? [0, 0, 0]}
              active={panel.id === activePanelId}
              onFocus={() => onFocus(panel.id)}
            />
          ))}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={13}
            maxPolarAngle={Math.PI / 1.7}
            target={[0, -0.2, 0]}
          />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto max-w-md rounded-sm border border-warning/30 bg-warning-soft/95 px-3 py-2 text-[11px] leading-relaxed text-warning shadow-panel backdrop-blur-sm">
          <p className="flex items-center gap-1.5 font-medium">
            <Compass size={13} /> Experimental spatial workspace
          </p>
          <p className="mt-1">
            Cards are positioned in a navigable Three.js scene. Live previews are non-interactive and 3D scatter opens
            in the standard workspace. Interaction and performance at larger view counts are not yet verified.
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-1 rounded-sm border border-border bg-surface/95 p-1 shadow-panel backdrop-blur-sm">
          <Button variant="ghost" size="xs" onClick={resetCamera}>
            <RotateCcw size={11} /> Reset camera
          </Button>
          <Button variant="ghost" size="xs" onClick={onAdd}>
            <Plus size={11} /> Add view
          </Button>
          <Button variant="secondary" size="xs" onClick={onExit}>
            <X size={11} /> Standard workspace
          </Button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 bg-surface/90 px-2 py-1.5 backdrop-blur-sm" aria-label="Spatial panel shortcuts">
        <span className="mr-1 text-[10px] text-faint">Open:</span>
        {panels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => onFocus(panel.id)}
            className={`rounded-sm border px-1.5 py-0.5 text-[10.5px] focus-visible:outline-2 focus-visible:outline-focus ${
              panel.id === activePanelId ? "border-accent text-accent" : "border-border text-muted hover:text-ink"
            }`}
          >
            {viewLabel(panel)}
          </button>
        ))}
        <span className="ml-auto hidden text-[10px] text-faint sm:inline">
          Drag to orbit · scroll to zoom · right-drag to pan
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="sm:hidden"
          onClick={() => setSpatialMode(false)}
          aria-label="Leave experimental spatial workspace"
        >
          Exit
        </Button>
      </div>
    </div>
  );
}
