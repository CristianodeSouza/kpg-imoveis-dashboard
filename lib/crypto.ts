import crypto from "crypto";

const DEV_ENCRYPTION_KEY = "dev-only-change-me-before-production";

function key() {
  if (process.env.NODE_ENV === "production" && !process.env.SETTINGS_ENCRYPTION_KEY) {
    throw new Error("SETTINGS_ENCRYPTION_KEY obrigatoria em producao.");
  }
  const source = process.env.SETTINGS_ENCRYPTION_KEY || process.env.SESSION_SECRET || DEV_ENCRYPTION_KEY;
  return crypto.createHash("sha256").update(source).digest();
}

export function encryptSecret(value?: string) {
  const clean = String(value || "").trim();
  if (!clean) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(clean, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value?: string | null) {
  if (!value) return "";
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) return "";

  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final()
  ]).toString("utf8");
}
