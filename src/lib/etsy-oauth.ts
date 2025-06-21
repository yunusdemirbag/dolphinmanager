import crypto from "crypto"

export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url")  // 43-128 karakter
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url")

  return { verifier, challenge }
} 