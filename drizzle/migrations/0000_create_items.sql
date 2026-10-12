CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT '日用品',
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT '个',
  location text NOT NULL DEFAULT '未指定',
  expiry date,
  source text NOT NULL DEFAULT '文字',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own items select" ON public.items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own items insert" ON public.items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own items update" ON public.items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own items delete" ON public.items FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX items_user_idx ON public.items(user_id);