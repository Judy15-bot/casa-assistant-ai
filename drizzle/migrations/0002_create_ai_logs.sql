CREATE TABLE public.ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  input_type text NOT NULL CHECK (input_type IN ('文字','语音','拍照','截图')),
  input_text text,
  has_image boolean NOT NULL DEFAULT false,
  prompt_version text NOT NULL,
  model text NOT NULL,
  latency_ms integer,
  ok boolean NOT NULL,
  error text,
  intent text CHECK (intent IN ('record','query','chat')),
  ai_output jsonb,
  ops_count integer NOT NULL DEFAULT 0,
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending','all_confirmed','partly_confirmed','all_cancelled')),
  confirmed_count integer,
  cancelled_count integer,
  edited_ops_count integer,
  edits jsonb,
  final_ops jsonb,
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_logs TO authenticated;
GRANT ALL ON public.ai_logs TO service_role;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai_logs select" ON public.ai_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ai_logs insert" ON public.ai_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ai_logs update" ON public.ai_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ai_logs delete" ON public.ai_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ai_logs_user_created ON public.ai_logs (user_id, created_at DESC);