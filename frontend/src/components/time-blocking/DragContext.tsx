"use client";

import React, { createContext, useContext, useRef, MutableRefObject } from "react";

export type DragInfo = { durationMins: number; grabOffset: number };

type DragContextValue = {
  dragInfoRef: MutableRefObject<DragInfo>;
  lastDropXRef: MutableRefObject<number>;
};

const DragContext = createContext<DragContextValue | null>(null);

export function DragProvider({ children }: { children: React.ReactNode }) {
  const dragInfoRef = useRef<DragInfo>({ durationMins: 30, grabOffset: 0 });
  const lastDropXRef = useRef<number>(0);
  return (
    <DragContext.Provider value={{ dragInfoRef, lastDropXRef }}>
      {children}
    </DragContext.Provider>
  );
}

export function useDragContext(): DragContextValue {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error("useDragContext must be used within DragProvider");
  return ctx;
}
