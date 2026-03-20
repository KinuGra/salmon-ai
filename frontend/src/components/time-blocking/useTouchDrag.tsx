"use client";

import React, { useState, useRef, useEffect, RefObject } from "react";
import { createPortal } from "react-dom";
import { DragInfo } from "./DragContext";

/** ドラッグ開始と判定するポインター移動量のしきい値 (px) */
export const DRAG_THRESHOLD_PX = 8;

type Options = {
  elementRef: RefObject<HTMLElement>;
  /** ドラッグ開始時に呼ばれる（Context へのメタ情報登録に使う） */
  onDragStart?: (meta: DragInfo) => void;
  /** 指を離した時に呼ばれる */
  onDrop: (clientX: number, clientY: number) => void;
  /** ドラッグ開始時のメタ情報を返す（grabOffset は Hook が内部で計算） */
  getDragMeta: () => Omit<DragInfo, "grabOffset">;
  /** ゴースト要素の border-radius */
  borderRadius?: string;
  /** true: ゴーストが X 方向もポインターに追随、false: 元の要素 X 位置に固定 */
  freeX?: boolean;
};

type GhostInit = { width: number; height: number; x: number; y: number };

export function useTouchDrag({
  elementRef,
  onDragStart,
  onDrop,
  getDragMeta,
  borderRadius = "12px",
  freeX = false,
}: Options): { isDragging: boolean; ghostPortal: React.ReactNode } {
  const [isDragging, setIsDragging] = useState(false);
  const [ghostInit, setGhostInit] = useState<GhostInit | null>(null);

  const ghostElRef = useRef<HTMLDivElement | null>(null);
  const ghostCloneRef = useRef<HTMLElement | null>(null);

  // 最新のコールバックを ref で保持（useEffect の deps を安定させるため）
  const freeXRef = useRef(freeX);
  const onDropRef = useRef(onDrop);
  const onDragStartRef = useRef(onDragStart);
  const getDragMetaRef = useRef(getDragMeta);
  useEffect(() => { freeXRef.current = freeX; }, [freeX]);
  useEffect(() => { onDropRef.current = onDrop; }, [onDrop]);
  useEffect(() => { onDragStartRef.current = onDragStart; }, [onDragStart]);
  useEffect(() => { getDragMetaRef.current = getDragMeta; }, [getDragMeta]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    let active = false, pid = -1;
    let startX = 0, startY = 0;
    let grabOffsetX = 0, grabOffsetY = 0, anchorX = 0;

    function onDown(e: PointerEvent) {
      if (e.pointerType === "mouse") return;
      const rect = el.getBoundingClientRect();
      active = false;
      pid = e.pointerId;
      grabOffsetX = Math.round(e.clientX - rect.left);
      grabOffsetY = Math.round(e.clientY - rect.top);
      anchorX = rect.left;
      startX = e.clientX;
      startY = e.clientY;
    }

    function onMove(e: PointerEvent) {
      if (e.pointerId !== pid) return;
      if (!active) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD_PX) return;
        active = true;
        el.setPointerCapture(pid);
        const rect = el.getBoundingClientRect();
        const meta = getDragMetaRef.current();
        const gx = freeXRef.current ? e.clientX - grabOffsetX : anchorX;
        const gy = e.clientY - grabOffsetY;
        ghostCloneRef.current = el.cloneNode(true) as HTMLElement;
        setIsDragging(true);
        setGhostInit({ width: rect.width, height: rect.height, x: gx, y: gy });
        onDragStartRef.current?.({ ...meta, grabOffset: grabOffsetY });
        return;
      }
      // ゴーストの位置を直接 DOM で更新（state 更新によるリレンダリングを避けるため）
      if (ghostElRef.current) {
        const gx = freeXRef.current ? e.clientX - grabOffsetX : anchorX;
        ghostElRef.current.style.transform = `translate(${gx}px,${e.clientY - grabOffsetY}px) scale(1.03)`;
      }
    }

    function onUp(e: PointerEvent) {
      if (e.pointerId !== pid) return;
      const wasActive = active;
      active = false;
      pid = -1;
      ghostCloneRef.current = null;
      setGhostInit(null);
      setIsDragging(false);
      if (wasActive) onDropRef.current(e.clientX, e.clientY);
    }

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [elementRef]);

  // createPortal でゴーストを body 直下にマウント（React のライフサイクル管理下に置く）
  const ghostPortal =
    ghostInit && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={(el) => {
              ghostElRef.current = el;
              if (el && ghostCloneRef.current) {
                el.innerHTML = "";
                el.appendChild(ghostCloneRef.current);
              }
            }}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: ghostInit.width,
              height: ghostInit.height,
              opacity: 0.75,
              pointerEvents: "none",
              zIndex: 9999,
              borderRadius,
              transform: `translate(${ghostInit.x}px,${ghostInit.y}px) scale(1.03)`,
              transformOrigin: "top left",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              transition: "none",
            }}
          />,
          document.body
        )
      : null;

  return { isDragging, ghostPortal };
}
