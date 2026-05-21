import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-[11px] text-white/45 mb-3 tracking-wider">404</div>
        <h1 className="text-[18px] font-semibold mb-2">Хуудас олдсонгүй</h1>
        <p className="text-white/45 text-[13px] mb-6">Таны хайсан хуудас байхгүй байна.</p>
        <Link href="/dashboard" className="btn-primary">Нүүр рүү буцах</Link>
      </div>
    </main>
  );
}
