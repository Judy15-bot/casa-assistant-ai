CREATE TABLE public.eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('text','image','baseline')),
  model text NOT NULL,
  prompt_version text NOT NULL,
  summary jsonb NOT NULL,
  scores jsonb NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eval_runs TO authenticated;
GRANT ALL ON public.eval_runs TO service_role;
ALTER TABLE public.eval_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own eval select" ON public.eval_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own eval insert" ON public.eval_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own eval update" ON public.eval_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own eval delete" ON public.eval_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX eval_runs_user_created ON public.eval_runs (user_id, created_at DESC);