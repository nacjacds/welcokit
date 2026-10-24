import crypto from "crypto";

// Short-lived signed token that lets the headless browser render the print
// page of a property that isn't published yet (the host downloading a PDF
// of their draft). Same HMAC approach as lib/impersonation.ts: only tokens
// this server issued verify, and each is bound to one property.
const TTL_MS = 5 * 60 * 1000;

function sign(data: string): string {
  return crypto.createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(data).digest("base64url");
}

export function createPrintToken(propertyId: string): string {
  const payload = `${propertyId}.${Date.now() + TTL_MS}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verifyPrintToken(token: string | undefined, propertyId: string): boolean {
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const payload = Buffer.from(encoded, "base64url").toString();
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const [id, expires] = payload.split(".");
  return id === propertyId && Number(expires) > Date.now();
}
