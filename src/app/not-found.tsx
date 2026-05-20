import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-[10px] font-mono uppercase tracking-widest text-blue mb-2">
          404 · Not Found
        </div>
        <h1 className="text-[20px] font-extrabold mb-2">Хуудас олдсонгүй</h1>
        <p className="text-sub text-[13px] mb-5">Таны хайсан хуудас байхгүй байна.</p>
        <Link href="/dashboard" className="btn-primary">Нүүр рүү буцах</Link>
      </div>
    </main>
  );
}
