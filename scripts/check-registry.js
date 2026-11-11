import { spawnSync } from "node:child_process";
import { mapStudies } from "../src/validation.js";
const url =
  "https://clinicaltrials.gov/api/v2/studies?query.cond=cystic%20fibrosis&pageSize=1&format=json";
const response = spawnSync(
  "curl",
  [
    "--fail",
    "--silent",
    "--show-error",
    "--max-time",
    "30",
    "--max-filesize",
    "2000000",
    url,
  ],
  { encoding: "utf8", maxBuffer: 2100000 },
);
if (response.status !== 0) {
  console.error(
    "Nie zweryfikowano rzeczywistego wyszukiwania:",
    response.stderr.trim(),
  );
  process.exit(1);
}
let data;
try {
  data = JSON.parse(response.stdout);
} catch {
  throw Error("API nie zwróciło JSON.");
}
const results = mapStudies(data, new Date().toISOString());
if (!results.length)
  throw Error("Brak poprawnego wyniku dla zapytania kontrolnego.");
console.log(
  JSON.stringify(
    {
      source: "ClinicalTrials.gov API v2",
      checkedAt: new Date().toISOString(),
      result: results[0].id,
      updated: results[0].updated,
    },
    null,
    2,
  ),
);
console.log(
  "Kontrola HTTP/JSON zakończona. Osobno sprawdź wyszukiwanie w przeglądarce (CORS).",
);
