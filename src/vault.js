import { validateWorkspace } from "./validation.js";
const keyName = "blisko.vault.v1";
export const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
const encode = (b) => {
  let s = "";
  for (const byte of new Uint8Array(b)) s += String.fromCharCode(byte);
  return btoa(s);
};
const decode = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function key(password, salt) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export function parseBackup(raw) {
  if (typeof raw !== "string" || raw.length > MAX_BACKUP_BYTES)
    throw Error("Plik kopii jest za duży (limit 4 MB).");
  let v;
  try {
    v = JSON.parse(raw);
  } catch {
    throw Error("Kopia jest uszkodzona. Bieżąca praca nie została zmieniona.");
  }
  if (
    v?.version !== 1 ||
    !["salt", "iv", "data"].every(
      (k) => typeof v[k] === "string" && /^[A-Za-z0-9+/]+={0,2}$/.test(v[k]),
    )
  )
    throw Error("Brak obsługiwanego zapisu.");
  try {
    if (
      decode(v.salt).length !== 16 ||
      decode(v.iv).length !== 12 ||
      decode(v.data).length < 16
    )
      throw Error();
  } catch {
    throw Error("Nieprawidłowy format kopii.");
  }
  return v;
}
export async function encryptBackup(data, password) {
  validateWorkspace(data);
  if (password.length < 12)
    throw Error("Użyj hasła o długości co najmniej 12 znaków.");
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(password, salt),
    new TextEncoder().encode(JSON.stringify(data)),
  );
  const raw = JSON.stringify({
    version: 1,
    salt: encode(salt),
    iv: encode(iv),
    data: encode(encrypted),
  });
  parseBackup(raw);
  return raw;
}
export async function decryptBackup(raw, password) {
  const v = parseBackup(raw);
  let plain;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode(v.iv) },
      await key(password, decode(v.salt)),
      decode(v.data),
    );
  } catch {
    throw Error(
      "Nie udało się otworzyć zapisu. Sprawdź hasło lub integralność kopii.",
    );
  }
  return validateWorkspace(JSON.parse(new TextDecoder().decode(plain)));
}
export const hasVault = () => Boolean(localStorage.getItem(keyName));
export async function saveVault(data, password) {
  validateWorkspace(data);
  if (password.length < 12)
    throw Error("Użyj hasła o długości co najmniej 12 znaków.");
  const existing = localStorage.getItem(keyName);
  if (existing) await decryptBackup(existing, password);
  const raw = await encryptBackup(data, password);
  if (localStorage.getItem(keyName) !== existing)
    throw Error(
      "Kopia została zmieniona w innej karcie. Otwórz aktualny zapis.",
    );
  localStorage.setItem(keyName, raw);
}
export async function loadVault(password) {
  const raw = localStorage.getItem(keyName);
  if (!raw) throw Error("Brak zapisu na urządzeniu.");
  return decryptBackup(raw, password);
}
export function exportVault() {
  const raw = localStorage.getItem(keyName);
  if (!raw) throw Error("Brak zapisanej kopii.");
  parseBackup(raw);
  return raw;
}
export async function importVault(raw, password, beforeCommit = () => {}) {
  const existing = localStorage.getItem(keyName);
  const data = await decryptBackup(raw, password);
  if (localStorage.getItem(keyName) !== existing)
    throw Error("Kopia została zmieniona w innej karcie. Spróbuj ponownie.");
  beforeCommit();
  localStorage.setItem(keyName, raw);
  return data;
}
export async function changeVaultPassword(current, next) {
  const existing = exportVault();
  const data = await decryptBackup(existing, current);
  const raw = await encryptBackup(data, next);
  if (localStorage.getItem(keyName) !== existing)
    throw Error("Kopia została zmieniona w innej karcie. Spróbuj ponownie.");
  localStorage.setItem(keyName, raw);
}
export function deleteVault() {
  localStorage.removeItem(keyName);
}
