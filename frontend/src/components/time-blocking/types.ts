export type Task = {
  id: number;
  title: string;
  description: string | null;
  priority: number; // 1:高, 2:中, 3:低
  is_completed: boolean;
  estimated_hours: number | null;
  ai_estimated_hours: number | null;
  start_time: string | null;
  end_time: string | null;
  due_date: string | null;
  achievement_rate: number | null; // 100, 70, 30, 0
  category: { id: number; name: string; color: string } | null;
};
