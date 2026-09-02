import { CAPABILITIES, CAPABILITY_BADGE, type CapabilityLevel } from '@voicelab/shared';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const VARIANT_BY_LEVEL: Record<CapabilityLevel, 'success' | 'warning' | 'secondary'> = {
  native: 'success',
  provider: 'warning',
  custom: 'secondary',
};

/** Renders the ✓ Native LiveKit / ⚠ Provider-dependent / ◆ Custom badge for a dashboard control,
 * with the exact implementation mechanism as a tooltip — see packages/shared/src/capability.ts.
 * This is the one place that mapping is rendered, so every setting is labeled consistently. */
export function CapabilityBadge({ capabilityKey }: { capabilityKey: string }) {
  const info = CAPABILITIES[capabilityKey];
  if (!info) return null;
  const badge = CAPABILITY_BADGE[info.level];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={VARIANT_BY_LEVEL[info.level]} className="cursor-help">
          <span aria-hidden>{badge.symbol}</span> {badge.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{info.mechanism}</TooltipContent>
    </Tooltip>
  );
}
