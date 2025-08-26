import { useState, useEffect, useRef, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

/**
 * Custom hook for scroll-triggered animations
 * Uses Intersection Observer for performance and smooth animations
 */
export const useScrollAnimation = (
  threshold: number = 0.1,
  triggerOnce: boolean = true,
  rootMargin: string = '0px 0px -50px 0px'
) => {
  const [ref, inView] = useInView({
    threshold,
    triggerOnce,
    rootMargin,
  });

  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (inView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [inView, hasAnimated]);

  return {
    ref,
    inView,
    hasAnimated,
    resetAnimation: () => setHasAnimated(false)
  };
};

/**
 * Hook for staggered animations on scroll
 */
export const useStaggeredScrollAnimation = (
  itemCount: number,
  staggerDelay: number = 0.1,
  threshold: number = 0.1
) => {
  const [ref, inView] = useInView({
    threshold,
    triggerOnce: true,
    rootMargin: '0px 0px -50px 0px'
  });

  const [animatedItems, setAnimatedItems] = useState<boolean[]>(
    new Array(itemCount).fill(false)
  );

  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => {
        setAnimatedItems(prev => prev.map(() => true));
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [inView]);

  const getItemAnimationDelay = (index: number): number => {
    return index * staggerDelay;
  };

  return {
    ref,
    inView,
    animatedItems,
    getItemAnimationDelay,
    resetAnimation: () => setAnimatedItems(new Array(itemCount).fill(false))
  };
};

/**
 * Hook for parallax scroll effects
 */
export const useParallaxScroll = (speed: number = 0.5) => {
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (ref.current) {
      const scrolled = window.pageYOffset;
      const rate = scrolled * speed;
      setOffset(rate);
    }
  }, [speed]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return {
    ref,
    offset,
    style: {
      transform: `translateY(${offset}px)`
    }
  };
};

/**
 * Hook for scroll progress tracking
 */
export const useScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      setProgress(Math.min(scrollPercent, 100));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
};

/**
 * Hook for scroll direction detection
 */
export const useScrollDirection = () => {
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.pageYOffset;
      
      if (currentScrollY > lastScrollY) {
        setDirection('down');
      } else {
        setDirection('up');
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return direction;
};

/**
 * Hook for scroll-based opacity changes
 */
export const useScrollOpacity = (startFade: number = 0, endFade: number = 100) => {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      
      if (scrollTop < startFade) {
        setOpacity(1);
      } else if (scrollTop > endFade) {
        setOpacity(0);
      } else {
        const fadeRange = endFade - startFade;
        const fadeProgress = (scrollTop - startFade) / fadeRange;
        setOpacity(1 - fadeProgress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [startFade, endFade]);

  return opacity;
};

/**
 * Hook for scroll-based scale changes
 */
export const useScrollScale = (minScale: number = 0.8, maxScale: number = 1.2) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const scrollProgress = Math.min(scrollTop / windowHeight, 1);
      
      const newScale = minScale + (maxScale - minScale) * scrollProgress;
      setScale(newScale);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [minScale, maxScale]);

  return scale;
};

/**
 * Hook for scroll-based rotation
 */
export const useScrollRotation = (maxRotation: number = 360) => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const scrollProgress = Math.min(scrollTop / windowHeight, 1);
      
      const newRotation = scrollProgress * maxRotation;
      setRotation(newRotation);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [maxRotation]);

  return rotation;
};
