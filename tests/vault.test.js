import { test } from "node:test";
import assert from "node:assert/strict";
import { saveVault, loadVault, deleteVault, hasVault } from "../src/vault.js";
const values = new Map();
globalThis.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k),
};
test("encrypted storage restores work, rejects wrong passwords, randomizes ciphertext and deletes copy", async () => {
  const data = {
    profile: { title: "", goal: "", raised: "" },
    contacts: [],
    facts: "",
    draft: "",
    topic: "Aktualizacja zbiórki",
    tasks: [{ title: "Prywatna notatka", detail: "", done: false }],
    saved: { dzieciom: { note: "Kontakt roboczy", status: "Do sprawdzenia" } },
  };
  await saveVault(data, "Testowe-haslo-2026");
  assert.equal(hasVault(), true);
  const first = values.get("blisko.vault.v1");
  assert.ok(!first.includes("Prywatna notatka"));
  assert.deepEqual(await loadVault("Testowe-haslo-2026"), data);
  await assert.rejects(loadVault("Nieprawidlowe-haslo"), /Sprawdź hasło/);
  await assert.rejects(saveVault(data, "Inne-dlugie-haslo"), /Sprawdź hasło/);
  assert.equal(values.get("blisko.vault.v1"), first);
  await saveVault(data, "Testowe-haslo-2026");
  assert.notEqual(values.get("blisko.vault.v1"), first);
  await assert.rejects(saveVault(data, "short"), /12 znaków/);
  deleteVault();
  assert.equal(hasVault(), false);
});

test("corrupted JSON fails without deletion", async () => {
  values.set("blisko.vault.v1", "{broken");
  await assert.rejects(loadVault("Testowe-haslo-2026"), /uszkodzona/);
  assert.equal(values.get("blisko.vault.v1"), "{broken");
  values.clear();
});
