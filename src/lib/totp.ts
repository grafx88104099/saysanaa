import { generateSecret as gen, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

export function generateSecret() {
  return gen({ length: 20 });
}

export function otpauthUrl(email: string, secret: string) {
  const issuer = process.env.APP_NAME || "SayaSanaa OS";
  return generateURI({
    strategy: "totp",
    issuer,
    label: email,
    secret,
    algorithm: "sha1",
    digits: 6,
    period: 30,
  });
}

export async function qrSvg(otpauth: string) {
  return QRCode.toString(otpauth, { type: "svg", margin: 1, width: 220 });
}

export function verifyToken(token: string, secret: string) {
  try {
    return verifySync({
      strategy: "totp",
      secret,
      token: token.replace(/\s+/g, ""),
      period: 30,
      epochTolerance: 1,
    });
  } catch {
    return false;
  }
}
