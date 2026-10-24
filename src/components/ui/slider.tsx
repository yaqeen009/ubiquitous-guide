import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function SingleSlider({
  value,
  min,
  max,
  step,
  onValueChange,
  label,
  id,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  label: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <SliderPrimitive.Root
      className="relative flex h-5 w-full touch-none select-none items-center"
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(next) => onValueChange(next[0] ?? min)}
      disabled={disabled}
      aria-label={label}
      id={id}
    >
      <SliderPrimitive.Track className="relative h-[3px] w-full grow rounded-full bg-border-strong/60">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full border-2 border-accent bg-surface shadow-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
}

export function RangeSlider({
  value,
  min,
  max,
  step,
  onValueChange,
  onValueCommit,
  label,
  disabled,
  className,
}: {
  value: [number, number];
  min: number;
  max: number;
  step: number;
  onValueChange: (value: [number, number]) => void;
  onValueCommit?: (value: [number, number]) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-5 w-full touch-none select-none items-center", className)}
      value={value}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={0}
      onValueChange={(next) => {
        const low = next[0] ?? min;
        const high = next[1] ?? max;
        onValueChange([low, high]);
      }}
      onValueCommit={(next) => {
        onValueCommit?.([next[0] ?? min, next[1] ?? max]);
      }}
      disabled={disabled}
      aria-label={label}
    >
      <SliderPrimitive.Track className="relative h-[3px] w-full grow rounded-full bg-border-strong/60">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block h-3.5 w-3.5 rounded-full border-2 border-accent bg-surface shadow-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
        aria-label={`${label} minimum`}
      />
      <SliderPrimitive.Thumb
        className="block h-3.5 w-3.5 rounded-full border-2 border-accent bg-surface shadow-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
        aria-label={`${label} maximum`}
      />
    </SliderPrimitive.Root>
  );
}
