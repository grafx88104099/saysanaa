import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { uploadAvatar } from "@/lib/storage";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const s = await readSession();
  if (!s || s.pending2fa) {
    return NextResponse.json({ error: "Нэвтрэх шаардлагатай" }, { status: 401 });
  }
  if (s.role !== "ADMIN" && s.role !== "PM") {
    return NextResponse.json({ error: "Эрх дутуу байна" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Файл олдсонгүй" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Зөвхөн PNG, JPEG, WEBP зөвшөөрөгдсөн" },
      { status: 400 },
    );
  }
  if (file.size > MAX) {
    return NextResponse.json(
      { error: "Хэт том файл (5MB-аас дээш)" },
      { status: 400 },
    );
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  try {
    const { url } = await uploadAvatar(file, ext);
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Алдаа" }, { status: 500 });
  }
}
