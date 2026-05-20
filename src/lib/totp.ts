import { authenticator } from "otplib";
import QRCode from "qrcode";

authenticator.options = { window: 1, step: 30 };

export function generateSecret() {
  return authenticator.generateSecret();
}

export function otpauthUrl(email: string, secret: string) {
  const issuer = process.env.APP_NAME || "SayaSanaa OS";
  return authenticator.keyuri(email, issuer, secret);
}

export async function qrDataUrl(otpauth: string) {
  return QRCode.toDataURL(otpauth, { margin: 1, width: 220 });
}

export function verifyToken(token: string, secret: string) {
  try {
    return authenticator.verify({ token: token.replace(/\s+/g, ""), secret });
  } catch {
    return false;
  }
}
