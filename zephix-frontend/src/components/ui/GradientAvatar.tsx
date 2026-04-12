import React from 'react';

const AVATAR_GRADIENTS: [string, string][] = [
  ['#378ADD', '#85B7EB'],
  ['#7F77DD', '#534AB7'],
  ['#1D9E75', '#5DCAA5'],
  ['#D85A30', '#F0997B'],
  ['#EF9F27', '#FAC775'],
  ['#D4537E', '#ED93B1'],
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || '?').toUpperCase();
}

function getGradient(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

interface GradientAvatarProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function GradientAvatar({ name, size = 26, className = '', style }: GradientAvatarProps) {
  const initials = getInitials(name);
  const [from, to] = getGradient(name);
  const fontSize = Math.max(8, Math.round(size * 0.35));

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 500,
        color: 'white',
        flexShrink: 0,
        ...style,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}
