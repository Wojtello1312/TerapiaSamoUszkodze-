import { test } from "node:test";
import assert from "node:assert/strict";
import {
  saveVault,
  loadVault,
  exportVault,
  importVault,
  changeVaultPassword,
  decryptBackup,
  parseBackup,
  MAX_BACKUP_BYTES,
} from "../src/vault.js";
const values = new Map();
globalThis.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k),
};
const data = {
  profile: { title: "Test", goal: "", raised: "" },
  tasks: [],
  contacts: [],
  facts: "",
  draft: "x".repeat(200000),
  topic: "",
  saved: {},
};
test("export, password rotation and import preserve encrypted data and fail atomically", async () => {
  await saveVault(data, "Old-password-123");
  const exported = exportVault();
  assert.ok(!exported.includes("Test"));
  await assert.rejects(
    changeVaultPassword("Wrong-password-123", "New-password-456"),
  );
  assert.equal(exportVault(), exported);
  await changeVaultPassword("Old-password-123", "New-password-456");
  const rotated = exportVault();
  assert.notEqual(rotated, exported);
  await assert.rejects(loadVault("Old-password-123"));
  assert.deepEqual(await loadVault("New-password-456"), data);
  assert.deepEqual(await decryptBackup(exported, "Old-password-123"), data);
  await assert.rejects(importVault(exported, "Wrong-password-123"));
  assert.equal(exportVault(), rotated);
  await importVault(exported, "Old-password-123");
  assert.deepEqual(await loadVault("Old-password-123"), data);
  const corrupted = JSON.parse(exported);
  corrupted.data =
    (corrupted.data[0] === "A" ? "B" : "A") + corrupted.data.slice(1);
  await assert.rejects(
    importVault(JSON.stringify(corrupted), "Old-password-123"),
  );
  assert.equal(exportVault(), exported);
  assert.throws(() => parseBackup("x".repeat(MAX_BACKUP_BYTES + 1)), /za duży/);
});
