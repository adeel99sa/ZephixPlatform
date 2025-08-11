import React, { useState, useEffect } from 'react';
import { Zap, Target } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

interface HeroSectionProps {
  onDemoRequest: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onDemoRequest }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);



  return (
    <section id="hero" className="relative hero-bg overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-0">
        <div className={`text-center transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Private Beta Badge */}
          <div className="mb-3">
            <StatusBadge onDark={true} />
          </div>
          
          {/* Trust row */}
          <div className="flex flex-wrap justify-center gap-2">
            <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">SSO</div>
            <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">RBAC</div>
            <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">Audit logs</div>
            <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium text-slate-300">Encryption at rest and in transit</div>
          </div>
        </div>
      </div>
    </section>
  );
};
