import { Repeat } from 'lucide-react';

interface RecurringEventBadgeProps {
  frequency: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
}

export function RecurringEventBadge({ frequency }: RecurringEventBadgeProps) {
  const frequencyLabels: Record<string, string> = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    annual: 'Anual'
  };

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      <Repeat className="w-3 h-3" />
      {frequencyLabels[frequency]}
    </span>
  );
}
