import { chromium } from "playwright";
import { createApp } from "../server/app.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const base = process.env.BASE_URL || "http://localhost:5173";
const server = createApp({ origin: new URL(base).origin });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const apiBase = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"],
});
const dir = await mkdtemp(join(tmpdir(), "blisko-test-"));
const errors = [];
try {
  async function pageFor(username) {
    const context = await browser.newContext();
    await context.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: apiBase + url.pathname });
      await route.fulfill({ response });
    });
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept());
    await p.goto(base);
    await p
      .getByRole("button", { name: "Ustawienia i zapis", exact: true })
      .click();
    await p.getByRole("button", { name: "Nowe konto", exact: true }).click();
    await p.getByLabel("Login konta", { exact: true }).fill(username);
    await p
      .getByLabel("Hasło konta (minimum 12 znaków)")
      .fill("Account-test-password-123");
    await p.getByRole("button", { name: "Utwórz konto", exact: true }).click();
    await p.getByRole("button", { name: "Wyloguj się", exact: true }).waitFor();
    return p;
  }
  const owner = await pageFor("owner-browser"),
    viewer = await pageFor("viewer-browser");
  await owner
    .getByRole("button", { name: "Dodaj zadanie", exact: true })
    .click();
  await owner.getByLabel("Co chcesz zrobić?").fill("Zadanie do synchronizacji");
  await owner.getByRole("button", { name: "Dodaj", exact: true }).click();
  await owner
    .getByLabel("Hasło szyfrowania sprawy (osobne od hasła konta)")
    .fill("Workspace-test-password");
  await owner.getByLabel("Nazwa nowej sprawy").fill("Przypadek testowy");
  await owner
    .getByRole("button", {
      name: "Utwórz sprawę z otwartej pracy",
      exact: true,
    })
    .click();
  await owner
    .getByRole("heading", { name: "Otwarta sprawa: Przypadek testowy" })
    .waitFor();
  await owner.getByLabel("Login istniejącego konta").fill("viewer-browser");
  await owner.getByRole("button", { name: "Nadaj lub zmień dostęp" }).click();
  await owner
    .getByText("viewer-browser · Obserwator", { exact: true })
    .waitFor();
  await viewer.getByRole("button", { name: "Odśwież listę spraw" }).click();
  await viewer
    .getByLabel("Hasło szyfrowania sprawy (osobne od hasła konta)")
    .fill("Workspace-test-password");
  await viewer
    .getByRole("button", { name: "Otwórz sprawę", exact: true })
    .click();
  await viewer
    .getByRole("heading", { name: "Otwarta sprawa: Przypadek testowy" })
    .waitFor();
  if (
    !(await viewer.getByRole("button", { name: "Wyślij zmiany" }).isDisabled())
  )
    throw Error("Viewer can write");
  await viewer.getByRole("button", { name: "Zadania", exact: true }).click();
  await viewer
    .getByText("Zadanie do synchronizacji", { exact: true })
    .waitFor();
  await owner
    .getByLabel("Hasło zapisu (co najmniej 12 znaków)")
    .fill("Local-test-password");
  await owner
    .getByRole("button", { name: "Zapisz zaszyfrowaną kopię" })
    .click();
  await owner
    .getByRole("button", { name: "Otwórz zapis", exact: true })
    .waitFor();
  const download = owner.waitForEvent("download");
  await owner.getByRole("button", { name: "Eksportuj zapisaną kopię" }).click();
  const file = join(dir, "copy.json");
  await (await download).saveAs(file);
  await owner
    .getByLabel("Dotychczasowe hasło kopii")
    .fill("Local-test-password");
  await owner
    .getByLabel("Nowe hasło kopii", { exact: true })
    .fill("Changed-test-password");
  await owner.getByLabel("Powtórz nowe hasło").fill("Changed-test-password");
  await owner
    .getByRole("button", { name: "Zmień hasło kopii", exact: true })
    .click();
  await owner
    .getByRole("status")
    .filter({ hasText: "Zmieniono hasło" })
    .waitFor();
  await owner
    .getByLabel("Hasło zapisu (co najmniej 12 znaków)")
    .fill("Changed-test-password");
  await owner
    .getByRole("button", { name: "Otwórz zapis", exact: true })
    .click();
  await owner
    .getByRole("status")
    .filter({ hasText: "Otwarto zapis" })
    .waitFor();
  await owner.getByLabel("Plik kopii (.json, do 4 MB)").setInputFiles(file);
  await owner.getByLabel("Hasło tego pliku").fill("Local-test-password");
  await owner
    .getByRole("button", { name: "Odtwórz kopię", exact: true })
    .click();
  await owner
    .getByRole("status")
    .filter({ hasText: "Odtworzono kopię" })
    .waitFor();
  await owner.getByRole("button", { name: "Pilotaż", exact: true }).click();
  await owner.getByRole("checkbox").check();
  await owner.getByRole("button", { name: "Rozpocznij pomiar" }).click();
  await owner.getByRole("button", { name: "Zadania", exact: true }).click();
  await owner.getByRole("button", { name: "Pilotaż", exact: true }).click();
  await owner.getByRole("button", { name: "Zatrzymaj pomiar" }).click();
  await owner.getByRole("button", { name: "Zapisz obserwację" }).click();
  await owner
    .getByRole("heading", { name: "Obserwacje w tej sesji: 1" })
    .waitFor();
  const report = owner.waitForEvent("download");
  await owner.getByRole("button", { name: "Eksportuj obserwacje" }).click();
  await (await report).saveAs(join(dir, "observations.json"));
  await owner.setViewportSize({ width: 390, height: 844 });
  if (
    await owner.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )
  )
    throw Error("Mobile overflow");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: two accounts, encrypted sharing, viewer role, export/import, password change, pilot timer/report, mobile. Uses fictitious data, not caregiver sessions.",
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
}
