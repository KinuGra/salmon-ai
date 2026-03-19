import { useState } from "react";
import React from "react";

export function useInboxDropZone({
  onReturnToInbox,
}: {
  onReturnToInbox: (taskId: number) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.getData("dragType") !== "scheduled") return;
    const taskId = Number(e.dataTransfer.getData("taskId"));
    if (!taskId) return;
    onReturnToInbox(taskId);
  }

  return { isDragOver, handleDragOver, handleDragLeave, handleDrop };
}
