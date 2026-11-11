// 浏览器端：读取文件、缩放成小图（保留透明）
export const fileToDataUrl = (f: Blob) =>
  new Promise<string>((ok, err) => { const r = new FileReader(); r.onload = () => ok(r.result as string); r.onerror = err; r.readAsDataURL(f); });

export async function shrink(dataUrl: string, max = 512, type = "image/webp") {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL(type, 0.85);
}
