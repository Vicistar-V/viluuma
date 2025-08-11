-- 1) ENUM-like validation via triggers (avoid CHECK for time-based / flexible validation)
-- Helper: validate modality/status values
CREATE OR REPLACE FUNCTION public.validate_goals_row()
RETURNS TRIGGER AS $$
BEGIN
  -- modality validation
  IF NEW.modality NOT IN ('project','checklist') THEN
    RAISE EXCEPTION 'invalid_modality';
  END IF;

  -- status validation
  IF NEW.status NOT IN ('active','archived','completed') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  -- weekly_hours non-negative if provided
  IF NEW.weekly_hours IS NOT NULL AND NEW.weekly_hours < 0 THEN
    RAISE EXCEPTION 'invalid_weekly_hours';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_milestones_row()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending','completed') THEN
    RAISE EXCEPTION 'invalid_milestone_status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_tasks_row()
RETURNS TRIGGER AS $$
DECLARE
  g_user UUID;
  m_goal UUID;
BEGIN
  -- status validation
  IF NEW.status NOT IN ('pending','completed') THEN
    RAISE EXCEPTION 'invalid_task_status';
  END IF;

  -- duration non-negative
  IF NEW.duration_hours IS NOT NULL AND NEW.duration_hours < 0 THEN
    RAISE EXCEPTION 'invalid_duration_hours';
  END IF;

  -- Ensure milestone belongs to goal
  SELECT goal_id INTO m_goal FROM public.milestones WHERE id = NEW.milestone_id;
  IF m_goal IS NULL OR m_goal <> NEW.goal_id THEN
    RAISE EXCEPTION 'milestone_goal_mismatch';
  END IF;

  -- Ensure task.user_id matches goal's user
  SELECT user_id INTO g_user FROM public.goals WHERE id = NEW.goal_id;
  IF g_user IS NULL OR NEW.user_id <> g_user THEN
    RAISE EXCEPTION 'task_user_mismatch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Ownership helper to keep RLS clean and avoid recursion
CREATE OR REPLACE FUNCTION public.goal_belongs_to_current_user(p_goal_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = p_goal_id AND g.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.milestone_belongs_to_current_user(p_milestone_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.milestones m
    JOIN public.goals g ON g.id = m.goal_id
    WHERE m.id = p_milestone_id AND g.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.task_belongs_to_current_user(p_task_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = p_task_id AND t.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 3) Tables
-- GOALS (FK to profiles, not auth.users per best practices)
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  modality TEXT NOT NULL,
  target_date DATE,
  weekly_hours INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- MILESTONES
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  order_index INTEGER,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  duration_hours INTEGER,
  is_anchored BOOLEAN NOT NULL DEFAULT false,
  priority TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 4) Policies (granular per command)
-- Goals
DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
DROP POLICY IF EXISTS "goals_insert_own" ON public.goals;
DROP POLICY IF EXISTS "goals_update_own" ON public.goals;
DROP POLICY IF EXISTS "goals_delete_own" ON public.goals;
CREATE POLICY "goals_select_own" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert_own" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update_own" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goals_delete_own" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- Milestones
DROP POLICY IF EXISTS "milestones_select_own" ON public.milestones;
DROP POLICY IF EXISTS "milestones_insert_own" ON public.milestones;
DROP POLICY IF EXISTS "milestones_update_own" ON public.milestones;
DROP POLICY IF EXISTS "milestones_delete_own" ON public.milestones;
CREATE POLICY "milestones_select_own" ON public.milestones FOR SELECT USING (public.goal_belongs_to_current_user(goal_id));
CREATE POLICY "milestones_insert_own" ON public.milestones FOR INSERT WITH CHECK (public.goal_belongs_to_current_user(goal_id));
CREATE POLICY "milestones_update_own" ON public.milestones FOR UPDATE USING (public.goal_belongs_to_current_user(goal_id));
CREATE POLICY "milestones_delete_own" ON public.milestones FOR DELETE USING (public.goal_belongs_to_current_user(goal_id));

-- Tasks
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- 5) Triggers for validation and updated_at
DROP TRIGGER IF EXISTS goals_validate_tr ON public.goals;
CREATE TRIGGER goals_validate_tr BEFORE INSERT OR UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.validate_goals_row();

DROP TRIGGER IF EXISTS goals_updated_at_tr ON public.goals;
CREATE TRIGGER goals_updated_at_tr BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS milestones_validate_tr ON public.milestones;
CREATE TRIGGER milestones_validate_tr BEFORE INSERT OR UPDATE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.validate_milestones_row();

DROP TRIGGER IF EXISTS milestones_updated_at_tr ON public.milestones;
CREATE TRIGGER milestones_updated_at_tr BEFORE UPDATE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tasks_validate_tr ON public.tasks;
CREATE TRIGGER tasks_validate_tr BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.validate_tasks_row();

DROP TRIGGER IF EXISTS tasks_updated_at_tr ON public.tasks;
CREATE TRIGGER tasks_updated_at_tr BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Progress aggregation function and trigger
CREATE OR REPLACE FUNCTION public.update_parent_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
  v_milestone_id UUID;
  v_total_m_tasks INTEGER;
  v_completed_m_tasks INTEGER;
  v_total_g_tasks INTEGER;
  v_completed_g_tasks INTEGER;
  v_goal_status TEXT;
BEGIN
  -- Determine affected ids based on operation
  IF TG_OP = 'DELETE' THEN
    v_goal_id := OLD.goal_id;
    v_milestone_id := OLD.milestone_id;
  ELSE
    v_goal_id := NEW.goal_id;
    v_milestone_id := NEW.milestone_id;
  END IF;

  -- Recalculate milestone counters
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total_m_tasks, v_completed_m_tasks
  FROM public.tasks
  WHERE milestone_id = v_milestone_id;

  UPDATE public.milestones
  SET total_tasks = COALESCE(v_total_m_tasks,0),
      completed_tasks = COALESCE(v_completed_m_tasks,0),
      status = CASE 
        WHEN COALESCE(v_total_m_tasks,0) > 0 AND COALESCE(v_total_m_tasks,0) = COALESCE(v_completed_m_tasks,0) THEN 'completed'
        ELSE 'pending'
      END,
      updated_at = now()
  WHERE id = v_milestone_id;

  -- Recalculate goal counters
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total_g_tasks, v_completed_g_tasks
  FROM public.tasks
  WHERE goal_id = v_goal_id;

  SELECT status INTO v_goal_status FROM public.goals WHERE id = v_goal_id;

  UPDATE public.goals
  SET total_tasks = COALESCE(v_total_g_tasks,0),
      completed_tasks = COALESCE(v_completed_g_tasks,0),
      status = CASE
        WHEN v_goal_status = 'archived' THEN 'archived' -- don't override archived
        WHEN COALESCE(v_total_g_tasks,0) > 0 AND COALESCE(v_total_g_tasks,0) = COALESCE(v_completed_g_tasks,0) THEN 'completed'
        ELSE 'active'
      END,
      completed_at = CASE
        WHEN v_goal_status <> 'archived' AND COALESCE(v_total_g_tasks,0) > 0 AND COALESCE(v_total_g_tasks,0) = COALESCE(v_completed_g_tasks,0) THEN now()
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = v_goal_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_task_change ON public.tasks;
CREATE TRIGGER on_task_change
AFTER INSERT OR UPDATE OF status, milestone_id, goal_id OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_parent_progress();

-- 7) Performance indexes
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON public.milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON public.tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

-- 8) RPCs
-- Create manual goal (with starter milestone and task)
CREATE OR REPLACE FUNCTION public.create_manual_goal(
  p_title TEXT,
  p_modality TEXT,
  p_target_date DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_goal_id UUID;
  v_milestone_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Gatekeeper hook (monetization) - intentionally commented for now
  -- IF NOT public.can_create_new_goal() THEN
  --   RAISE EXCEPTION 'free_tier_limit_reached';
  -- END IF;

  INSERT INTO public.goals (user_id, title, modality, target_date)
  VALUES (auth.uid(), p_title, p_modality, p_target_date)
  RETURNING id INTO v_goal_id;

  INSERT INTO public.milestones (goal_id, title, order_index)
  VALUES (v_goal_id, 'Getting started', 1)
  RETURNING id INTO v_milestone_id;

  INSERT INTO public.tasks (goal_id, milestone_id, user_id, title, description)
  VALUES (v_goal_id, v_milestone_id, auth.uid(), 'First task', 'Tap to edit your first task');

  RETURN v_goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Milestone CRUD helpers
CREATE OR REPLACE FUNCTION public.create_milestone(p_goal_id uuid, p_title text, p_order_index integer DEFAULT NULL)
RETURNS uuid AS $$
DECLARE v_id uuid; BEGIN
  IF NOT public.goal_belongs_to_current_user(p_goal_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.milestones(goal_id, title, order_index)
  VALUES (p_goal_id, p_title, p_order_index)
  RETURNING id INTO v_id; RETURN v_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_milestone_title(p_milestone_id uuid, p_title text)
RETURNS void AS $$
BEGIN
  IF NOT public.milestone_belongs_to_current_user(p_milestone_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.milestones SET title = p_title WHERE id = p_milestone_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.delete_milestone_and_tasks(p_milestone_id uuid)
RETURNS integer AS $$
DECLARE v_count integer; BEGIN
  IF NOT public.milestone_belongs_to_current_user(p_milestone_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.tasks WHERE milestone_id = p_milestone_id;
  DELETE FROM public.milestones WHERE id = p_milestone_id RETURNING 1 INTO v_count;
  RETURN COALESCE(v_count, 0);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Task CRUD helpers
CREATE OR REPLACE FUNCTION public.create_task(
  p_milestone_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_duration_hours integer DEFAULT NULL,
  p_is_anchored boolean DEFAULT false
) RETURNS uuid AS $$
DECLARE v_id uuid; v_goal uuid; v_user uuid; BEGIN
  SELECT goal_id INTO v_goal FROM public.milestones WHERE id = p_milestone_id;
  IF v_goal IS NULL OR NOT public.goal_belongs_to_current_user(v_goal) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT user_id INTO v_user FROM public.goals WHERE id = v_goal;
  INSERT INTO public.tasks (
    goal_id, milestone_id, user_id, title, description, priority, start_date, end_date, duration_hours, is_anchored
  ) VALUES (
    v_goal, p_milestone_id, v_user, p_title, p_description, p_priority, p_start_date, p_end_date, p_duration_hours, COALESCE(p_is_anchored,false)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.delete_task(p_task_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT public.task_belongs_to_current_user(p_task_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.tasks WHERE id = p_task_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
