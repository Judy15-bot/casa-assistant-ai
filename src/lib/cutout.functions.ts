import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// 用 remove.bg 抠图：输入 data URL，返回透明背景 PNG 的 data URL。
export const removeBackground = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ image: z.string().startsWith("data:image/").max(14_000_000) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["REMOVE_BG_API_KEY"];
    if (!key) return { ok: false as const, error: "未配置抠图密钥，已使用原图" };
    const form = new FormData();
    form.append("image_file_b64", data.image.slice(data.image.indexOf(",") + 1));
    form.append("size", "preview");
    form.append("format", "png");
    const res = await fetch("https://api.remove.bg/v1.0/removebg", { method: "POST", headers: { "X-Api-Key": key }, body: form });
    if (!res.ok) {
      const msg = res.status === 402 ? "抠图额度已用完，已使用原图" : res.status === 403 ? "抠图密钥无效，已使用原图" : "抠图失败，已使用原图";
      console.error("remove.bg", res.status, await res.text().catch(() => ""));
      return { ok: false as const, error: msg };
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { ok: true as const, image: `data:image/png;base64,${btoa(bin)}` };
  });
