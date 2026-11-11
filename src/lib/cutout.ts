import { removeBackground } from "./cutout.functions";
import { shrink } from "./image";

/** 抠图并缩成小图；失败时返回 null（抠图失败不影响主流程） */
export async function cutoutImage(dataUrl: string): Promise<string | null> {
  try {
    const r = await removeBackground({ data: { image: dataUrl } });
    if (!r.ok) { console.warn(r.error); return null; }
    return await shrink(r.image, 384);
  } catch (e) {
    console.error("cutout", e);
    return null;
  }
}
