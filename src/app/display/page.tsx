import { redirect } from "next/navigation";
import { readKioskCookie, touchKioskToken, validateKioskToken } from "@/lib/kiosk";
import DisplayBoard from "./DisplayBoard";

export default async function DisplayPage() {
  const cookieToken = await readKioskCookie();
  const row = await validateKioskToken(cookieToken);
  if (!row) redirect("/display/setup");
  touchKioskToken(row.id);
  return <DisplayBoard label={row.label} />;
}
