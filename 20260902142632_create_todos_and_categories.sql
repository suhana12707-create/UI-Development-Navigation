/*
# Create categories and todos tables (single-tenant, no auth)

1. New Tables
- `categories`
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `color` (text, default '#3B82F6', stores hex color for category display)
  - `icon` (text, default 'circle', stores lucide icon name)
  - `created_at` (timestamptz, default now)
- `todos`
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `completed` (boolean, default false)
  - `category_id` (uuid, foreign key to categories, nullable, ON DELETE SET NULL)
  - `priority` (text, default 'medium', values: low/medium/high)
  - `due_date` (date, nullable)
  - `created_at` (timestamptz, default now)
2. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (no sign-in).
3. Important Notes
- Single-tenant app: no user_id columns, no auth.uid() checks.
- Category deletion sets todos.category_id to NULL (preserves tasks).
- Default categories seeded for immediate usability.
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  icon text NOT NULL DEFAULT 'circle',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_todos" ON todos;
CREATE POLICY "anon_select_todos" ON todos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_todos" ON todos;
CREATE POLICY "anon_insert_todos" ON todos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_todos" ON todos;
CREATE POLICY "anon_update_todos" ON todos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_todos" ON todos;
CREATE POLICY "anon_delete_todos" ON todos FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_todos_category_id ON todos(category_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);

-- Seed default categories
INSERT INTO categories (name, color, icon)
VALUES
  ('Personal', '#10B981', 'user'),
  ('Work', '#3B82F6', 'briefcase'),
  ('Shopping', '#F59E0B', 'shopping-cart'),
  ('Health', '#EF4444', 'heart-pulse')
ON CONFLICT DO NOTHING;
