"use client";
import { useEffect, useState } from "react";

const WD = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"];
const MO = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!now) {
    return <div className="text-right" style={{ width: 220 }} />;
  }

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateLine = `${now.getDate()} · ${MO[now.getMonth()]} · ${WD[now.getDay()]}`;

  return (
    <div className="text-right">
      <div className="text-[44px] font-semibold tracking-tight tabular-nums leading-none">
        {hh}:{mm}
        <span className="text-white/30 text-[28px]">:{ss}</span>
      </div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 mt-1.5">
        {dateLine}
      </div>
    </div>
  );
}
