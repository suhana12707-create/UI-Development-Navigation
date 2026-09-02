import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
};

export type Priority = 'low' | 'medium' | 'high';

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  category_id: string | null;
  priority: Priority;
  due_date: string | null;
  created_at: string;
};

export type TodoWithCategory = Todo & {
  categories: Pick<Category, 'id' | 'name' | 'color' | 'icon'> | null;
};
