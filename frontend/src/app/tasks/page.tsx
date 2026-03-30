import { Suspense } from "react";
import TaskListPage from "@/components/task-list/TaskListPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">読み込み中...</div>}>
      <TaskListPage />
    </Suspense>
  );
}
