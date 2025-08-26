import { useState, useEffect, useRef, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

/**
 * Custom hook for animated metric counters
 * Provides smooth counting animations with configurable timing and easing
 */
export const useMetricCounter = (
  endValue: number | string,
  startValue: number = 0,
  duration: number = 2000,
  delay: number = 0,
  threshold: number = 0.1
) => {
  const [count, setCount] = useState(startValue);
  const [isCounting, setIsCounting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const [ref, inView] = useInView({
    threshold,
    triggerOnce: true,
    rootMargin: '0px 0px -50px 0px'
  });

  const easeOutQuart = useCallback((t: number): number => {
    return 1 - Math.pow(1 - t, 4);
  }, []);

  const easeInOutCubic = useCallback((t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }, []);

  const easeOutBack = useCallback((t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }, []);

  const animateCount = useCallback((start: number, end: number, duration: number, easing: (t: number) => number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = performance.now();
    startTimeRef.current = startTime;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);

      const currentCount = start + (end - start) * easedProgress;
      setCount(Math.round(currentCount));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsCounting(false);
        setCount(end);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const startCounting = useCallback(() => {
    if (hasStarted || isCounting) return;

    setHasStarted(true);
    setIsCounting(true);

    const timer = setTimeout(() => {
      if (typeof endValue === 'number') {
        animateCount(startValue, endValue, duration, easeOutQuart);
      } else {
        // For string values, just set immediately
        setCount(endValue);
        setIsCounting(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [endValue, startValue, duration, delay, hasStarted, isCounting, animateCount, easeOutQuart]);

  useEffect(() => {
    if (inView && !hasStarted) {
      startCounting();
    }
  }, [inView, hasStarted, startCounting]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setCount(startValue);
    setIsCounting(false);
    setHasStarted(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [startValue]);

  const restart = useCallback(() => {
    reset();
    setTimeout(() => {
      startCounting();
    }, 100);
  }, [reset, startCounting]);

  return {
    ref,
    count,
    isCounting,
    hasStarted,
    reset,
    restart,
    startCounting
  };
};

/**
 * Hook for percentage counters with decimal precision
 */
export const usePercentageCounter = (
  endValue: number,
  startValue: number = 0,
  decimalPlaces: number = 1,
  duration: number = 2000,
  delay: number = 0
) => {
  const [count, setCount] = useState(startValue);
  const [isCounting, setIsCounting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const animationRef = useRef<number>();

  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
    rootMargin: '0px 0px -50px 0px'
  });

  const easeOutQuart = useCallback((t: number): number => {
    return 1 - Math.pow(1 - t, 4);
  }, []);

  const animateCount = useCallback((start: number, end: number, duration: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      const currentCount = start + (end - start) * easedProgress;
      setCount(Number(currentCount.toFixed(decimalPlaces)));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsCounting(false);
        setCount(Number(end.toFixed(decimalPlaces)));
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [easeOutQuart, decimalPlaces]);

  const startCounting = useCallback(() => {
    if (hasStarted || isCounting) return;

    setHasStarted(true);
    setIsCounting(true);

    const timer = setTimeout(() => {
      animateCount(startValue, endValue, duration);
    }, delay);

    return () => clearTimeout(timer);
  }, [endValue, startValue, duration, delay, hasStarted, isCounting, animateCount]);

  useEffect(() => {
    if (inView && !hasStarted) {
      startCounting();
    }
  }, [inView, hasStarted, startCounting]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    ref,
    count,
    isCounting,
    hasStarted
  };
};

/**
 * Hook for range counters (e.g., "55-65")
 */
export const useRangeCounter = (
  startRange: number,
  endRange: number,
  duration: number = 2000,
  delay: number = 0
) => {
  const [startCount, setStartCount] = useState(0);
  const [endCount, setEndCount] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const animationRef = useRef<number>();

  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
    rootMargin: '0px 0px -50px 0px'
  });

  const easeOutQuart = useCallback((t: number): number => {
    return 1 - Math.pow(1 - t, 4);
  }, []);

  const animateCount = useCallback((start: number, end: number, duration: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      const currentStart = start * easedProgress;
      const currentEnd = end * easedProgress;

      setStartCount(Math.round(currentStart));
      setEndCount(Math.round(currentEnd));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsCounting(false);
        setStartCount(start);
        setEndCount(end);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [easeOutQuart]);

  const startCounting = useCallback(() => {
    if (hasStarted || isCounting) return;

    setHasStarted(true);
    setIsCounting(true);

    const timer = setTimeout(() => {
      animateCount(startRange, endRange, duration);
    }, delay);

    return () => clearTimeout(timer);
  }, [startRange, endRange, duration, delay, hasStarted, isCounting, animateCount]);

  useEffect(() => {
    if (inView && !hasStarted) {
      startCounting();
    }
  }, [inView, hasStarted, startCounting]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    ref,
    startCount,
    endCount,
    isCounting,
    hasStarted,
    displayValue: `${startCount}-${endCount}`
  };
};

/**
 * Hook for currency counters with formatting
 */
export const useCurrencyCounter = (
  endValue: number,
  startValue: number = 0,
  currency: string = '$',
  duration: number = 2000,
  delay: number = 0
) => {
  const { ref, count, isCounting, hasStarted } = useMetricCounter(
    endValue,
    startValue,
    duration,
    delay
  );

  const formatCurrency = useCallback((value: number): string => {
    if (value >= 1000000) {
      return `${currency}${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${currency}${(value / 1000).toFixed(1)}K`;
    } else {
      return `${currency}${value.toLocaleString()}`;
    }
  }, [currency]);

  return {
    ref,
    count,
    isCounting,
    hasStarted,
    formattedCount: formatCurrency(count)
  };
};
