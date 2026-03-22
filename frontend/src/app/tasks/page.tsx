import { Suspense } from "react";
import TaskListPage from "@/components/task-list/TaskListPage";

export default function Page() {
  return (
    <Suspense>
      <TaskListPage />
    </Suspense>
  );
}
