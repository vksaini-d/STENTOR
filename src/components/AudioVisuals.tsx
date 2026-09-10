import { cn } from '../lib/utils';

/**
 * A horizontal bar meter that visualizes audio level in real-time.
 * Used in both Teacher (shows own mic level) and Student (shows incoming level) views.
 *
 * The bar width is driven by the `level` prop (0-1).
 * CSS transition handles the smooth interpolation between values.
 */
export function AudioLevelMeter({ level, className }: { level: number; className?: string }) {
  return (
    <div className={cn("w-full h-1.5 bg-slate-800 rounded-full overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-75 ease-out"
        style={{
          width: `${Math.max(2, level * 100)}%`,
          backgroundColor: level > 0.7
            ? '#EF4444'   // Red — clipping / loud
            : level > 0.3
              ? '#F59E0B' // Amber — good volume
              : '#22C55E' // Green — normal
        }}
      />
    </div>
  );
}

/**
 * Five vertical bars that bounce with audio level, like a tiny equalizer.
 * Each bar is offset slightly in timing for a natural staggered effect.
 * Used inside the Teacher mic button to show live voice activity.
 */
export function AudioBars({ level, barCount = 5, className }: { level: number; barCount?: number; className?: string }) {
  return (
    <div className={cn("flex items-end justify-center gap-[3px]", className)}>
      {Array.from({ length: barCount }).map((_, i) => {
        // Each bar gets a slightly different height multiplier for organic look
        const offset = Math.sin((i / barCount) * Math.PI); // peaks in the middle
        const barLevel = Math.min(1, level * (0.5 + offset * 0.8));
        const minH = 4;
        const maxH = 28;
        const height = minH + barLevel * (maxH - minH);

        return (
          <div
            key={i}
            className="w-[3px] rounded-full bg-white/90 transition-[height] duration-75 ease-out"
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}

/**
 * A circular ring that scales based on audio level.
 * Used as the glowing halo around the mic button when broadcasting.
 */
export function AudioRing({ level, className }: { level: number; className?: string }) {
  const scale = 1 + level * 0.3;
  const opacity = 0.15 + level * 0.25;

  return (
    <div
      className={cn(
        "absolute inset-0 rounded-full bg-brand transition-all duration-100 ease-out pointer-events-none",
        className,
      )}
      style={{
        transform: `scale(${scale})`,
        opacity,
      }}
    />
  );
}

/**
 * A simple pill badge for displaying connection / status info.
 */
export function StatusPill({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}) {
  const colors = {
    default: 'bg-slate-800 border-slate-700 text-slate-300',
    success: 'bg-brand/10 border-brand/30 text-brand',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium",
      colors[variant],
      className,
    )}>
      {children}
    </span>
  );
}

/**
 * Dot indicator for connection status.
 */
export function StatusDot({ active, className }: { active: boolean; className?: string }) {
  return (
    <span className={cn(
      "inline-block w-2 h-2 rounded-full",
      active ? "bg-brand animate-pulse" : "bg-slate-500",
      className,
    )} />
  );
}
