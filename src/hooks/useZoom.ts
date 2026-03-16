import { useRef, useState, useCallback, useEffect } from 'react';

interface ZoomState {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_SENSITIVITY = 0.001;

export function useZoom() {
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // ── Helpers ──────────────────────────────────────────────
  const clampTranslation = useCallback(
    (scale: number, x: number, y: number): { x: number; y: number } => {
      if (!containerRef.current) return { x, y };
      const { width, height } = containerRef.current.getBoundingClientRect();
      const maxX = (width * (scale - 1)) / 2;
      const maxY = (height * (scale - 1)) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [],
  );

  const reset = useCallback(() => {
    setZoom({ scale: 1, x: 0, y: 0 });
  }, []);

  const isZoomed = zoom.scale > 1;

  // ── Desktop: Wheel ────────────────────────────────────────
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      setZoom((prev) => {
        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, prev.scale * (1 + delta * 5)),
        );

        // Zoom centrado no cursor
        const scaleRatio = newScale / prev.scale;
        const newX = mouseX - scaleRatio * (mouseX - prev.x);
        const newY = mouseY - scaleRatio * (mouseY - prev.y);

        if (newScale === 1) return { scale: 1, x: 0, y: 0 };

        const clamped = clampTranslation(newScale, newX, newY);
        return { scale: newScale, ...clamped };
      });
    },
    [clampTranslation],
  );

  // ── Desktop: Pan com mouse ────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isZoomed) return;
      isPanning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    },
    [isZoomed],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };

      setZoom((prev) => {
        const clamped = clampTranslation(prev.scale, prev.x + dx, prev.y + dy);
        return { ...prev, ...clamped };
      });
    },
    [clampTranslation],
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // ── Mobile: Pinch-to-zoom ─────────────────────────────────
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchMidpoint = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      lastTouchDist.current = Math.hypot(
        b.clientX - a.clientX,
        b.clientY - a.clientY,
      );
      lastTouchMidpoint.current = {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
      };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 2 || lastTouchDist.current === null) return;
      e.preventDefault();
      if (!containerRef.current) return;

      const [a, b] = [e.touches[0], e.touches[1]];
      const newDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const scaleChange = newDist / lastTouchDist.current;
      lastTouchDist.current = newDist;

      const rect = containerRef.current.getBoundingClientRect();
      const midX = (a.clientX + b.clientX) / 2 - rect.left - rect.width / 2;
      const midY = (a.clientY + b.clientY) / 2 - rect.top - rect.height / 2;

      setZoom((prev) => {
        const newScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, prev.scale * scaleChange),
        );
        const scaleRatio = newScale / prev.scale;
        const newX = midX - scaleRatio * (midX - prev.x);
        const newY = midY - scaleRatio * (midY - prev.y);

        if (newScale === 1) return { scale: 1, x: 0, y: 0 };

        const clamped = clampTranslation(newScale, newX, newY);
        return { scale: newScale, ...clamped };
      });
    },
    [clampTranslation],
  );

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
  }, []);

  // ── Attach wheel com passive: false ──────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Cursor ────────────────────────────────────────────────
  const cursor = isZoomed
    ? isPanning.current
      ? 'grabbing'
      : 'grab'
    : 'zoom-in';

  return {
    zoom,
    reset,
    isZoomed,
    containerRef,
    cursor,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
