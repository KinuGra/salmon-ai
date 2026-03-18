export type Task = {
  id: number;
  title: string;
  description: string | null;
  priority: 1 | 2 | 3;
  is_completed: boolean;
  estimated_hours: number | null;
  ai_estimated_hours: number | null;
  start_time: string | null;
  end_time: string | null;
  due_date: string | null;
  achievement_rate: number | null;
  category: { id: number; name: string; color: string } | null;
};
