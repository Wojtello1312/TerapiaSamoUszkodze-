import React, { useState, useRef } from "react";
import {
  exportVault,
  importVault,
  changeVaultPassword,
  MAX_BACKUP_BYTES,
} from "./vault";
export default function BackupTools({
  notify,
  onImported,
  onVaultChanged,
  dirty,
  data,
}) {
  const [current, C] = useState(""),
    [next, N] = useState(""),
    [repeat, R] = useState(""),
    [importPassword, P] = useState(""),
    [file, F] = useState(null),
    [busy, B] = useState(false);
  const latest = useRef(data);
  latest.current = data;
  async function perform(fn) {
    B(true);
    try {
      await fn();
    } catch (e) {
      notify(e.message);
    } finally {
      B(false);
    }
  }
  return (
    <section className="card content-card narrow settings-block">
      <h3>Kopia zapasowa i hasło</h3>
      <p>
        Eksport zawiera ostatnią zapisaną kopię, nie późniejsze zmiany na
        ekranie. Plik pozostaje zaszyfrowany.
      </p>
      <button
        className="outline"
        disabled={busy}
        onClick={() =>
          perform(async () => {
            const raw = exportVault();
            const url = URL.createObjectURL(
              new Blob([raw], { type: "application/json" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = `blisko-kopia-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            notify("Pobrano zaszyfrowaną kopię.");
          })
        }
      >
        Eksportuj zapisaną kopię
      </button>
      {dirty && (
        <p className="info">
          Masz niezapisane zmiany. Najpierw zapisz je, jeśli mają znaleźć się w
          eksporcie.
        </p>
      )}
      <hr />
      <h3>Odtwórz kopię z pliku</h3>
      <label htmlFor="backup-file">Plik kopii (.json, do 4 MB)</label>
      <input
        id="backup-file"
        type="file"
        accept=".json,application/json"
        disabled={busy}
        onChange={(e) => {
          F(e.target.files?.[0] || null);
          P("");
        }}
      />
      <label htmlFor="import-password">Hasło tego pliku</label>
      <input
        id="import-password"
        type="password"
        autoComplete="off"
        value={importPassword}
        onChange={(e) => P(e.target.value)}
      />
      <button
        className="outline"
        disabled={busy || !file || !importPassword}
        onClick={() =>
          perform(async () => {
            if (file.size > MAX_BACKUP_BYTES)
              throw Error("Plik kopii jest za duży (limit 4 MB).");
            if (
              !window.confirm(
                "Odtworzenie zastąpi lokalną kopię oraz otwartą pracę. Kontynuować?",
              )
            )
              return;
            const snapshot = latest.current;
            const restored = await importVault(
              await file.text(),
              importPassword,
              () => {
                if (latest.current !== snapshot)
                  throw Error(
                    "W trakcie importu zmieniono pracę. Spróbuj ponownie.",
                  );
              },
            );
            onImported(restored);
            P("");
            F(null);
            document.getElementById("backup-file").value = "";
            notify("Odtworzono kopię z pliku.");
          })
        }
      >
        Odtwórz kopię
      </button>
      <hr />
      <h3>Zmień hasło lokalnej kopii</h3>
      <p>
        Zmiana dotyczy kopii na tym urządzeniu. Wcześniejsze eksporty i kopia na
        serwerze nadal wymagają poprzedniego hasła.
      </p>
      <label htmlFor="old-vault-password">Dotychczasowe hasło kopii</label>
      <input
        id="old-vault-password"
        type="password"
        autoComplete="off"
        value={current}
        onChange={(e) => C(e.target.value)}
      />
      <label htmlFor="new-vault-password">Nowe hasło kopii</label>
      <input
        id="new-vault-password"
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => N(e.target.value)}
      />
      <label htmlFor="repeat-vault-password">Powtórz nowe hasło</label>
      <input
        id="repeat-vault-password"
        type="password"
        autoComplete="new-password"
        value={repeat}
        onChange={(e) => R(e.target.value)}
      />
      <div className="button-row">
        <button
          className="primary"
          disabled={busy || !current || next.length < 12 || next !== repeat}
          onClick={() =>
            perform(async () => {
              await changeVaultPassword(current, next);
              C("");
              N("");
              R("");
              onVaultChanged();
              notify("Zmieniono hasło zapisanej kopii.");
            })
          }
        >
          {busy ? "Przetwarzanie…" : "Zmień hasło kopii"}
        </button>
      </div>
    </section>
  );
}
