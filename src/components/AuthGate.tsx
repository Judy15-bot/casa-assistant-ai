import { useState, type ReactNode } from "react";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/lib/store";

export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  if (session === undefined) return <div className="min-h-screen bg-background" />;
  if (!session) return <Login />;
  return <>{children}</>;
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password: pw })
        : await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === "up" && !data.session) setMsg("注册成功！请去邮箱点击确认链接后再登录。");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg(String(r.error.message ?? r.error));
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-background px-6">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-primary/10">
        <Package className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-center font-display text-3xl font-bold">家底</h1>
      <p className="mb-8 mt-1 text-center text-sm text-muted-foreground">登录后，物品清单会安全保存在云端</p>

      <button onClick={google} className="mb-4 w-full rounded-full border bg-card py-3 text-sm font-medium active:scale-[.98]">
        使用 Google 继续
      </button>
      <div className="mb-4 text-center text-xs text-muted-foreground">或使用邮箱</div>
      <form onSubmit={submit} className="space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱"
          className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="密码（至少 6 位）"
          className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        <button disabled={busy} className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {busy ? "请稍候…" : mode === "in" ? "登录" : "注册"}
        </button>
      </form>
      {msg && <p className="mt-3 text-center text-xs text-warn">{msg}</p>}
      <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }} className="mt-5 text-center text-sm text-muted-foreground">
        {mode === "in" ? "还没有账号？注册" : "已有账号？登录"}
      </button>
    </div>
  );
}
