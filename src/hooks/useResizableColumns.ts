import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

interface ResizeState {
  index: number;
  startX: number;
  startWidth: number;
  nextWidth?: number;
  invertDelta: boolean;
  mode: "pair" | "single";
  edge?: "left" | "right";
}

interface UseResizableColumnsOptions {
  minWidths?: number[];
  storageKey?: string;
  direction?: "ltr" | "rtl";
}

const DEFAULT_MIN_WIDTH = 80;

export function useResizableColumns(
  initialWidths: number[],
  options: UseResizableColumnsOptions = {}
) {
  const { minWidths = [], storageKey, direction = "ltr" } = options;
  const resizeStateRef = useRef<ResizeState | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>(() => {
    if (typeof window === "undefined" || !storageKey) {
      return initialWidths;
    }

    const storedWidths = window.localStorage.getItem(storageKey);

    if (!storedWidths) {
      return initialWidths;
    }

    try {
      const parsedWidths = JSON.parse(storedWidths);

      if (
        Array.isArray(parsedWidths) &&
        parsedWidths.length === initialWidths.length &&
        parsedWidths.every((width) => typeof width === "number")
      ) {
        return parsedWidths;
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }

    return initialWidths;
  });

  useEffect(() => {
    setColumnWidths((currentWidths) => {
      if (currentWidths.length === initialWidths.length) {
        return currentWidths;
      }

      return initialWidths;
    });
  }, [initialWidths]);

  useEffect(() => {
    if (typeof window !== "undefined" && storageKey) {
      window.localStorage.setItem(storageKey, JSON.stringify(columnWidths));
    }
  }, [columnWidths, storageKey]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const state = resizeStateRef.current;

      if (!state) {
        return;
      }

      const pointerDelta = event.clientX - state.startX;
      if (state.mode === "single") {
        const delta = state.edge === "left" ? -pointerDelta : pointerDelta;
        const currentMinWidth = minWidths[state.index] ?? DEFAULT_MIN_WIDTH;
        const nextCurrentWidth = Math.max(currentMinWidth, state.startWidth + delta);

        setColumnWidths((currentWidths) => {
          if (currentWidths[state.index] === nextCurrentWidth) {
            return currentWidths;
          }

          const updatedWidths = [...currentWidths];
          updatedWidths[state.index] = nextCurrentWidth;
          return updatedWidths;
        });

        return;
      }

      const baseDelta = direction === "rtl" ? -pointerDelta : pointerDelta;
      const delta = state.invertDelta ? -baseDelta : baseDelta;
      const currentMinWidth = minWidths[state.index] ?? DEFAULT_MIN_WIDTH;
      const nextMinWidth = minWidths[state.index + 1] ?? DEFAULT_MIN_WIDTH;
      const pairWidth = state.startWidth + (state.nextWidth ?? 0);

      let nextCurrentWidth = state.startWidth + delta;
      let nextAdjacentWidth = (state.nextWidth ?? 0) - delta;

      if (nextCurrentWidth < currentMinWidth) {
        nextCurrentWidth = currentMinWidth;
        nextAdjacentWidth = pairWidth - nextCurrentWidth;
      }

      if (nextAdjacentWidth < nextMinWidth) {
        nextAdjacentWidth = nextMinWidth;
        nextCurrentWidth = pairWidth - nextAdjacentWidth;
      }

      setColumnWidths((currentWidths) => {
        if (
          currentWidths[state.index] === nextCurrentWidth &&
          currentWidths[state.index + 1] === nextAdjacentWidth
        ) {
          return currentWidths;
        }

        const updatedWidths = [...currentWidths];
        updatedWidths[state.index] = nextCurrentWidth;
        updatedWidths[state.index + 1] = nextAdjacentWidth;
        return updatedWidths;
      });
    };

    const stopResizing = () => {
      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
    };
  }, [direction, minWidths]);

  const startResize = (
    index: number,
    event: ReactPointerEvent<HTMLButtonElement>,
    resizeOptions?: {
      invertDelta?: boolean;
      mode?: "pair" | "single";
      edge?: "left" | "right";
    }
  ) => {
    const mode = resizeOptions?.mode ?? "pair";

    if (mode === "pair" && index >= columnWidths.length - 1) {
      return;
    }

    resizeStateRef.current = {
      index,
      startX: event.clientX,
      startWidth: columnWidths[index],
      nextWidth: mode === "pair" ? columnWidths[index + 1] : undefined,
      invertDelta: resizeOptions?.invertDelta ?? false,
      mode,
      edge: resizeOptions?.edge,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    event.preventDefault();
  };

  return {
    columnWidths,
    startResize,
  };
}