import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { DataRow } from "@/types";
import type { ScatterEncoding, ScatterPoint } from "@/viz/encoding";
import { MISSING_CATEGORY } from "@/data/colors";
import { formatNumber } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";
import { useUiStore } from "@/store/useUiStore";

const DEFAULT_CAMERA: [number, number, number] = [3.05, 2.25, 3.65];
const ACCENT = { light: "#0d5c52", dark: "#63c9b8" } as const;

interface HoverState {
  point: ScatterPoint;
  x: number;
  y: number;
}

function PointCloud({
  encoding,
  pointSize,
  opacity,
  onHover,
  onSelect,
}: {
  encoding: ScatterEncoding;
  pointSize: number;
  opacity: number;
  onHover: (hover: HoverState | null) => void;
  onSelect: (row: DataRow) => void;
}) {
  const { size, raycaster, invalidate } = useThree();
  const points = encoding.points;

  useEffect(() => {
    raycaster.params.Points = { threshold: 0.055 };
    invalidate();
  }, [raycaster, invalidate]);

  const geometry = useMemo(() => {
    const count = points.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const color = new THREE.Color();
    points.forEach((point, index) => {
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
      color.set(point.color);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      sizes[index] = point.radius;
    });
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    next.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    next.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    next.computeBoundingSphere();
    next.computeBoundingBox();
    return next;
  }, [points]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uPointSize: { value: pointSize },
          uOpacity: { value: opacity },
          uPixelRatio: { value: Math.min(size.width > 0 ? window.devicePixelRatio || 1 : 1, 2) },
          uScale: { value: 5.4 },
        },
        vertexShader: `
          attribute vec3 aColor;
          attribute float aSize;
          varying vec3 vColor;
          uniform float uPointSize;
          uniform float uPixelRatio;
          uniform float uScale;
          void main() {
            vColor = aColor;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * uPointSize * (uScale / max(0.1, -mvPosition.z)) * uPixelRatio;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          uniform float uOpacity;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float distanceToCenter = length(coord);
            if (distanceToCenter > 0.5) discard;
            float alpha = smoothstep(0.5, 0.36, distanceToCenter);
            gl_FragColor = vec4(vColor, uOpacity * alpha);
          }
        `,
      }),
    // Uniforms are updated below without rebuilding the material.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uPointSize = { value: pointSize };
    material.uniforms.uOpacity = { value: opacity };
    material.uniforms.uPixelRatio = { value: Math.min(window.devicePixelRatio || 1, 2) };
    material.needsUpdate = true;
    invalidate();
  }, [material, pointSize, opacity, invalidate]);

  useEffect(() => () => material.dispose(), [material]);

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.index === undefined) return;
    const point = points[event.index];
    if (!point) return;
    const native = event.nativeEvent;
    onHover({ point, x: native.clientX, y: native.clientY });
  };

  return (
    <points
      geometry={geometry}
      material={material}
      onPointerMove={handleMove}
      onPointerOut={() => onHover(null)}
      onClick={(event) => {
        event.stopPropagation();
        if (event.index === undefined) return;
        const point = points[event.index];
        if (point) onSelect(point.row);
      }}
    />
  );
}

function SceneFrame({ theme }: { theme: "light" | "dark" }) {
  const box = useMemo(() => {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const edges = new THREE.EdgesGeometry(geometry);
    geometry.dispose();
    return edges;
  }, []);
  useEffect(() => () => box.dispose(), [box]);

  const axes = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -1, -1, -1, 1.2, -1, -1,
      -1, -1, -1, -1, 1.2, -1,
      -1, -1, -1, -1, -1, 1.2,
    ]);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    return geometry;
  }, []);
  useEffect(() => () => axes.dispose(), [axes]);

  return (
    <group>
      <lineSegments geometry={box}>
        <lineBasicMaterial color={theme === "dark" ? "#6a6c60" : "#a8a498"} transparent opacity={0.35} />
      </lineSegments>
      <lineSegments geometry={axes}>
        <lineBasicMaterial color={theme === "dark" ? "#8b8e80" : "#8d887c"} transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

function SelectionMarker({
  point,
  theme,
  pointSize,
  primary = true,
}: {
  point: ScatterPoint;
  theme: "light" | "dark";
  pointSize: number;
  primary?: boolean;
}) {
  const radius = (primary ? 0.018 : 0.011) + pointSize * (primary ? 0.0035 : 0.0022);
  return (
    <group position={[point.x, point.y, point.z]}>
      <mesh>
        <sphereGeometry args={[radius * (1 + point.radius * 0.3), 16, 16]} />
        <meshBasicMaterial color={theme === "dark" ? "#ffffff" : "#141412"} transparent={!primary} opacity={primary ? 1 : 0.6} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 2.4 * point.radius, 12, 12]} />
        <meshBasicMaterial color={ACCENT[theme]} wireframe transparent opacity={primary ? 0.9 : 0.55} />
      </mesh>
    </group>
  );
}

function CameraRig({ resetToken }: { resetToken: number }) {
  const camera = useThree((state) => state.camera);
  const controls = useRef<OrbitControlsImpl>(null);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    camera.position.set(...DEFAULT_CAMERA);
    instance.target.set(0, 0, 0);
    instance.update();
    invalidate();
  }, [resetToken, camera, invalidate]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.8}
      zoomSpeed={0.9}
      panSpeed={0.7}
      minDistance={1.8}
      maxDistance={12}
    />
  );
}

export function Scatter3D({
  encoding,
  axes,
}: {
  encoding: ScatterEncoding;
  axes?: { x: string | null; y: string | null; z: string | null };
}) {
  const theme = useDataStore((state) => state.theme);
  const config = useDataStore((state) => state.config);
  const selectedRowId = useDataStore((state) => state.selectedRowId);
  const selectedRowIds = useDataStore((state) => state.selectedRowIds);
  const selectRow = useDataStore((state) => state.selectRow);
  const resetToken = useDataStore((state) => state.cameraResetToken);
  const setInspectorTab = useUiStore((state) => state.setInspectorTab);
  const [hover, setHover] = useState<HoverState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);
  const selectedPoints = encoding.points.filter((point) => selectedIds.has(point.row.id));
  const hoveredPoint = hover ? { ...hover.point } : null;

  const handleHover = (next: HoverState | null) => {
    if (!next) {
      setHover(null);
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    setHover({
      point: next.point,
      x: rect ? next.x - rect.left : next.x,
      y: rect ? next.y - rect.top : next.y,
    });
  };

  const axesLabel = config
    ? [
        { axis: "X", column: axes?.x ?? config.axes.x, color: "#d55e00" },
        { axis: "Y", column: axes?.y ?? config.axes.y, color: "#009e73" },
        { axis: "Z", column: axes?.z ?? config.axes.z, color: "#0072b2" },
      ]
    : [];

  return (
    <div
      ref={containerRef}
      role="application"
      tabIndex={0}
      aria-label={`Interactive 3D scatter plot with ${encoding.points.length} plotted points. Drag to rotate, scroll to zoom, right-drag to pan. Press Escape to clear the selection.`}
      className="relative h-full w-full overflow-hidden rounded-md focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
      onKeyDown={(event) => {
        if (event.key === "Escape") selectRow(null);
        if (event.key.toLowerCase() === "r") useDataStore.getState().requestCameraReset();
      }}
    >
      <Canvas
        camera={{ position: DEFAULT_CAMERA, fov: 42, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onPointerMissed={() => selectRow(null)}
        className="!absolute inset-0"
        aria-hidden="true"
      >
        <SceneFrame theme={theme} />
        <PointCloud
          encoding={encoding}
          pointSize={config?.display.pointSize ?? 4}
          opacity={config?.display.opacity ?? 0.85}
          onHover={handleHover}
          onSelect={(row) => {
            selectRow(row.id);
            setInspectorTab("record");
          }}
        />
        {selectedPoints.map((point) => (
          <SelectionMarker
            key={point.row.id}
            point={point}
            theme={theme}
            pointSize={config?.display.pointSize ?? 4}
            primary={point.row.id === selectedRowId}
          />
        ))}
        {hoveredPoint && !selectedIds.has(hoveredPoint.row.id) ? (
          <mesh position={[hoveredPoint.x, hoveredPoint.y, hoveredPoint.z]}>
            <sphereGeometry args={[0.022 + (config?.display.pointSize ?? 4) * 0.004, 12, 12]} />
            <meshBasicMaterial color={theme === "dark" ? "#ffffff" : "#141412"} transparent opacity={0.5} />
          </mesh>
        ) : null}
        <CameraRig resetToken={resetToken} />
        <GizmoHelper alignment="bottom-right" margin={[58, 58]}>
          <GizmoViewport axisColors={["#d55e00", "#009e73", "#0072b2"]} labelColor={theme === "dark" ? "#ecebe4" : "#1b1a17"} />
        </GizmoHelper>
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
        {axesLabel.map((axis) => (
          <span
            key={axis.axis}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-border/80 bg-surface/85 px-1.5 py-1 text-[10.5px] text-ink-soft backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: axis.color }} aria-hidden />
            <span className="font-mono text-[10px] text-muted">{axis.axis}</span>
            <span className="max-w-36 truncate">{axis.column ?? "not mapped"}</span>
          </span>
        ))}
      </div>

      {hover ? (
        <div
          className="pointer-events-none absolute z-20 w-56 rounded-sm border border-border-strong bg-surface/95 p-2.5 shadow-panel backdrop-blur-sm"
          style={{
            left: Math.min(Math.max(hover.x + 14, 8), Math.max(8, (containerRef.current?.clientWidth ?? 240) - 232)),
            top: Math.min(Math.max(hover.y + 14, 8), Math.max(8, (containerRef.current?.clientHeight ?? 200) - 110)),
          }}
          role="tooltip"
        >
          <TooltipRows point={hover.point} />
        </div>
      ) : null}
    </div>
  );
}

function TooltipRows({ point }: { point: ScatterPoint }) {
  const dataset = useDataStore((state) => state.dataset);
  if (!dataset) return null;
  const numericColumns = dataset.columns.filter((column) => column.type === "numeric").slice(0, 3);
  return (
    <div className="space-y-1.5 text-[11.5px]">
      <p className="mono-num text-[10px] uppercase tracking-wider text-muted">Row {point.row.id + 1}</p>
      {numericColumns.map((column) => (
        <div key={column.name} className="flex items-baseline justify-between gap-3">
          <span className="truncate text-muted">{column.name}</span>
          <span className="mono-num shrink-0 text-ink">{formatNumber(point.row.numeric[column.index])}</span>
        </div>
      ))}
      {point.category ? (
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
          <span className="truncate text-muted">Category</span>
          <span className="shrink-0 text-ink">{point.category === MISSING_CATEGORY ? "Missing" : point.category}</span>
        </div>
      ) : null}
      <p className="pt-0.5 text-[10.5px] text-faint">Click to inspect this record</p>
    </div>
  );
}

export function Scatter3DFallback({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="surface-grid h-20 w-20 rounded-md border border-dashed border-border-strong" aria-hidden />
      <p className="max-w-xs text-[12.5px] leading-relaxed text-muted">{message}</p>
      {children}
    </div>
  );
}
