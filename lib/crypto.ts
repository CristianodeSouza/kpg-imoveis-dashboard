import crypto from "crypto";

const DEV_ENCRYPTION_KEY = "dev-only-change-me-before-production";

function key(source?: string) {
  if (process.env.NODE_ENV === "production" && !process.env.SETTINGS_ENCRYPTION_KEY) {
    throw new Error("SETTINGS_ENCRYPTION_KEY obrigatoria em producao.");
  }
  const value = source || process.env.SETTINGS_ENCRYPTION_KEY || process.env.SESSION_SECRET || DEV_ENCRYPTION_KEY;
  return crypto.createHash("sha256").update(value).digest();
}

function keyVersion() {
  const version = Number(process.env.SETTINGS_ENCRYPTION_KEY_VERSION || 1);
  return Number.isFinite(version) && version > 0 ? Math.floor(version) : 1;
}

export function encryptSecret(value?: string) {
  const clean = String(value || "").trim();
  if (!clean) return null;

  const iv = crypto.randomBytes(12);
  const version = keyVersion();
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(clean, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [`v${version}`, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptWithKey(value: string, source?: string) {
  const parts = value.split(".");
  const versioned = parts[0]?.startsWith("v") && parts.length === 4;
  const [, ivTextV, tagTextV, encryptedTextV] = parts;
  const [ivTextOld, tagTextOld, encryptedTextOld] = parts;
  const ivText = versioned ? ivTextV : ivTextOld;
  const tagText = versioned ? tagTextV : tagTextOld;
  const encryptedText = versioned ? encryptedTextV : encryptedTextOld;
  if (!ivText || !tagText || !encryptedText) return "";

  const decipher = crypto.createDecipheriv("aes-256-gcm", key(source), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function decryptSecret(value?: string | null) {
  if (!value) return "";
  try {
    return decryptWithKey(value);
  } catch {
    const previous = process.env.SETTINGS_ENCRYPTION_KEY_PREVIOUS;
    if (!previous) return "";
    try {
      return decryptWithKey(value, previous);
    } catch {
      return "";
    }
  }
}
