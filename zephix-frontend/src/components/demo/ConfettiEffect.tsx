import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface ConfettiEffectProps {
  isActive: boolean;
  duration?: number;
}

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ 
  isActive, 
  duration = 5000 
}) => {
  const [windowDimension, setWindowDimension] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [showConfetti, setShowConfetti] = useState(isActive);

  useEffect(() => {
    const handleResize = () => {
      setWindowDimension({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isActive) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isActive, duration]);

  if (!showConfetti) return null;

  return (
    <Confetti
      width={windowDimension.width}
      height={windowDimension.height}
      numberOfPieces={200}
      recycle={false}
      colors={['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']}
      gravity={0.1}
      wind={0.01}
      opacity={0.8}
      run={showConfetti}
    />
  );
};