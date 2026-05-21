import { startSetup } from "./actions";
import ConfirmForm from "./ConfirmForm";

export default async function TwoFASetupPage() {
  const { secret, qr } = await startSetup();
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-black text-white">
      <div className="w-full max-w-[340px]">
        <h1 className="text-[15px] font-medium text-center mb-2 tracking-tight">
          Authenticator холбох
        </h1>
        <p className="text-center text-white/50 text-[12px] mb-7">
          QR-аа Authenticator апп-аар уншуулна уу
        </p>

        <div className="flex flex-col items-center gap-4 mb-7">
          <div
            className="bg-white p-3 rounded-md [&_svg]:block [&_svg]:w-[220px] [&_svg]:h-[220px]"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <div className="text-[11px] text-white/40 break-all text-center select-all">
            {secret}
          </div>
        </div>

        <ConfirmForm />
      </div>
    </main>
  );
}
