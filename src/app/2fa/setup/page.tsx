import { startSetup } from "./actions";
import ConfirmForm from "./ConfirmForm";

export default async function TwoFASetupPage() {
  const { secret, qr } = await startSetup();
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[460px]">
        <div className="card p-7">
          <div className="text-[10px] font-mono uppercase tracking-widest text-blue mb-2">
            2FA Setup · Алхам 2 / 2
          </div>
          <h1 className="text-[18px] font-extrabold mb-1">Authenticator холбох</h1>
          <p className="text-sub text-[12px] mb-5">
            Google Authenticator, Microsoft Authenticator, эсвэл 1Password зэрэг апп нээгээд доорх QR кодыг
            уншуулна уу. Үүний дараа гарч ирэх 6 оронтой кодыг оруулна.
          </p>

          <div className="flex flex-col items-center gap-3 mb-5">
            <div className="bg-white p-3 rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR" width={220} height={220} />
            </div>
            <div className="text-[10px] text-sub font-mono break-all text-center max-w-full">
              Гар оруулга: <span className="text-tx">{secret}</span>
            </div>
          </div>

          <ConfirmForm />
        </div>
      </div>
    </main>
  );
}
