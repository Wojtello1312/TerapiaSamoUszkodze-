import { chromium } from "playwright";
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox"],
  });
  const p = await b.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(process.env.BASE_URL || "http://localhost:5173");
  await p
    .getByRole("heading", { name: "Mniej spraw do zapamiętania." })
    .waitFor();
  await p.getByRole("button", { name: "Dodaj zadanie", exact: true }).click();
  await p.getByLabel("Co chcesz zrobić?").fill("Sprawdzić fundację");
  await p.getByRole("button", { name: "Dodaj", exact: true }).click();
  await p.getByRole("button", { name: "Poszukiwania", exact: true }).click();
  await p
    .getByRole("button", { name: "Zapisz trop", exact: true })
    .first()
    .click();
  await p.getByRole("button", { name: /Moje poszukiwania/ }).click();
  await p.getByLabel("Twoja notatka").fill("Notatka do zachowania");
  await p
    .getByRole("button", { name: "Ustawienia i zapis", exact: true })
    .click();
  await p
    .getByLabel("Hasło zapisu (co najmniej 12 znaków)")
    .fill("Testowe-haslo-2026");
  await p.getByRole("button", { name: "Zapisz zaszyfrowaną kopię" }).click();
  await p.getByRole("button", { name: "Otwórz zapis", exact: true }).waitFor();
  await p.waitForFunction(() => localStorage.getItem("blisko.vault.v1"));
  const raw = await p.evaluate(() => localStorage.getItem("blisko.vault.v1"));
  if (raw.includes("Sprawdzić") || raw.includes("Notatka"))
    throw Error("Plaintext stored");
  await p.reload();
  await p
    .getByRole("button", { name: "Ustawienia i zapis", exact: true })
    .click();
  await p
    .getByLabel("Hasło zapisu (co najmniej 12 znaków)")
    .fill("Nieprawidlowe-haslo");
  await p.getByRole("button", { name: "Otwórz zapis", exact: true }).click();
  await p
    .getByRole("status")
    .filter({ hasText: "Nie udało się otworzyć" })
    .waitFor();
  await p
    .getByLabel("Hasło zapisu (co najmniej 12 znaków)")
    .fill("Testowe-haslo-2026");
  await p.getByRole("button", { name: "Otwórz zapis", exact: true }).click();
  await p.getByRole("status").filter({ hasText: "Otwarto zapis" }).waitFor();
  await p.getByRole("button", { name: "Zadania", exact: true }).click();
  await p.getByText("Sprawdzić fundację", { exact: true }).waitFor();
  await p.getByRole("button", { name: "Poszukiwania", exact: true }).click();
  await p.getByRole("button", { name: /Moje poszukiwania/ }).click();
  if (
    (await p.getByLabel("Twoja notatka").inputValue()) !==
    "Notatka do zachowania"
  )
    throw Error("Notes lost");
  await p.route("https://clinicaltrials.gov/api/v2/studies?*", (route) =>
    route.fulfill({
      json: {
        studies: [
          {
            protocolSection: {
              identificationModule: {
                nctId: "NCT12345678",
                briefTitle: "Fixture study",
              },
              statusModule: {
                overallStatus: "RECRUITING",
                lastUpdatePostDateStruct: { date: "2026-10-01" },
              },
              contactsLocationsModule: {
                locations: [{ facility: "Test facility", country: "Poland" }],
              },
            },
          },
        ],
      },
    }),
  );
  await p
    .getByLabel("Rozpoznanie lub hasło po angielsku")
    .fill("test condition");
  if (
    !(await p
      .getByRole("button", { name: "Szukaj w rejestrze", exact: true })
      .isDisabled())
  )
    throw Error("Consent missing");
  await p.getByRole("checkbox").check();
  await p
    .getByRole("button", { name: "Szukaj w rejestrze", exact: true })
    .click();
  await p.getByText("Fixture study", { exact: true }).waitFor();
  await p
    .getByRole("button", { name: "Zapisz do sprawdzenia", exact: true })
    .click();
  await p.getByRole("button", { name: /Moje poszukiwania/ }).click();
  await p
    .locator(".source-card")
    .filter({ hasText: "Fixture study" })
    .waitFor();
  await p.route("https://clinicaltrials.gov/api/v2/studies?*", (r) =>
    r.abort(),
  );
  await p
    .getByRole("button", { name: "Szukaj w rejestrze", exact: true })
    .click();
  await p.locator(".error").waitFor();
  await p.setViewportSize({ width: 390, height: 844 });
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw Error("Overflow");
  await p.setViewportSize({ width: 1440, height: 1050 });
  await p.getByRole("button", { name: "Dodaj zadanie", exact: true }).click();
  await p.keyboard.press("Shift+Tab");
  if (
    !(await p.evaluate(() =>
      document.querySelector("[role=dialog]").contains(document.activeElement),
    ))
  )
    throw Error("Focus escaped dialog");
  await p.keyboard.press("Escape");
  if (await p.getByRole("dialog").count()) throw Error("Escape failed");
  await p
    .getByRole("button", { name: "Ustawienia i zapis", exact: true })
    .click();
  p.on("dialog", (d) => d.accept());
  await p.getByRole("button", { name: "Wyczyść sesję", exact: true }).click();
  await p.getByRole("button", { name: "Poszukiwania", exact: true }).click();
  if (await p.getByLabel("Rozpoznanie lub hasło po angielsku").inputValue())
    throw Error("Search data survived session clear");
  if (await p.getByRole("checkbox").isChecked())
    throw Error("Consent survived clear");
  if (await p.locator(".trial-result").count())
    throw Error("Results survived clear");
  if (errors.length) throw Error(errors.join());
  await b.close();
  console.log(
    "PASS: encrypted save/reload, wrong password, tasks/notes restored, consent, API mapping (fixture), save study, API error, mobile, no page errors.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
