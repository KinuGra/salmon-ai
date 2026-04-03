export type Task = {
  id: number;
  title: string;
  description: string | null;
  priority: 1 | 2 | 3 | null;
  is_completed: boolean;
  estimated_hours: number | null;
  ai_estimated_hours: number | null;
  ai_estimation_reason: string | null;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  achievement_rate: number | null;
  category: { id: number; name: string; color: string } | null;
};
