import type { ReactNode } from 'react';
import { CapabilityBadge } from '@/components/CapabilityBadge';
import { Label } from '@/components/ui/label';

/** Standard layout for one dashboard control: label + capability badge on one line, a one-line
 * description underneath, and the control itself — matching the "every setting should have a
 * label, description, control, capability badge" requirement. */
export function SettingRow({
  label,
  description,
  capabilityKey,
  htmlFor,
  children,
}: {
  label: string;
  description?: string;
  capabilityKey: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={htmlFor} className="text-sm">
          {label}
        </Label>
        <CapabilityBadge capabilityKey={capabilityKey} />
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
