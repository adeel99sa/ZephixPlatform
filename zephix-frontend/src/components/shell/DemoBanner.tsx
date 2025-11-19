import { isDemoUser, getDemoModeMessage } from '@/lib/demo';

interface DemoBannerProps {
  email?: string;
}

export default function DemoBanner({ email }: DemoBannerProps) {
  if (!email || !isDemoUser(email)) return null;

  return (
    <div className="w-full text-center text-xs py-1 bg-amber-50 border-b border-amber-200 text-amber-800">
      {getDemoModeMessage(email)}
    </div>
  );
}

