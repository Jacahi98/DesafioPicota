import { useCallback, useRef, useState } from "react";

// Sustituye a react-use-measure (no está entre las dependencias del
// proyecto) por un ResizeObserver directo — mismo shape de salida
// ([ref, {width,height}]) que esperan los componentes de motion-primitives
// adaptados aquí (InfiniteSlider, SlidingNumber).
export function useMeasure<T extends Element>(): [(el: T | null) => void, { width: number; height: number }] {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect();
    if (!el) return;
    observerRef.current = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({ width, height });
    });
    observerRef.current.observe(el);
  }, []);

  return [ref, dimensions];
}
