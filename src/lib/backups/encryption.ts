import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto";

const ITERATIONS = 600_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export type EncryptedBackupEnvelope = {
  format: "fernotech-encrypted-backup";
  version: 1;
  algorithm: "AES-256-GCM";
  keyDerivation: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  authenticationTag: string;
  ciphertext: string;
};

export function encryptBackup(
  plaintext: string,
  passphrase: string,
): EncryptedBackupEnvelope {
  if (passphrase.length < 12) {
    throw new Error("La phrase de chiffrement doit contenir au moins 12 caractères.");
  }

  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LENGTH, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    format: "fernotech-encrypted-backup",
    version: 1,
    algorithm: "AES-256-GCM",
    keyDerivation: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    authenticationTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptBackup(
  envelope: EncryptedBackupEnvelope,
  passphrase: string,
): string {
  if (
    envelope.format !== "fernotech-encrypted-backup" ||
    envelope.version !== 1 ||
    envelope.algorithm !== "AES-256-GCM" ||
    envelope.keyDerivation !== "PBKDF2-SHA256" ||
    envelope.iterations !== ITERATIONS
  ) {
    throw new Error("Le format ou la version de cette sauvegarde n’est pas reconnu.");
  }

  const salt = Buffer.from(envelope.salt, "base64");
  const iv = Buffer.from(envelope.iv, "base64");
  const authenticationTag = Buffer.from(
    envelope.authenticationTag,
    "base64",
  );
  if (
    salt.length !== SALT_LENGTH ||
    iv.length !== IV_LENGTH ||
    authenticationTag.length !== 16
  ) {
    throw new Error("Le fichier de sauvegarde chiffré est invalide.");
  }

  const key = pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LENGTH, "sha256");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authenticationTag);
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
