import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { sources } from "../src/sources.js";
const checks = {};
for (const s of sources) {
  const r = spawnSync(
    "curl",
    [
      "--silent",
      "--show-error",
      "--location",
      "--max-time",
      "20",
      "--max-filesize",
      "2000000",
      "--output",
      "/dev/null",
      "--write-out",
      "%{http_code}",
      s.url,
    ],
    { encoding: "utf8" },
  );
  checks[s.id] = {
    attemptedAt: new Date().toISOString(),
    verifiedAt: null,
    status:
      r.status === 0 && /^2\d\d$/.test(r.stdout.trim())
        ? "reachable_unreviewed"
        : /403/.test(r.stderr)
          ? "blocked"
          : "unavailable",
    httpStatus: r.stdout.trim() || null,
    source: s.url,
  };
  console.log(s.id + ": " + checks[s.id].status);
}
writeFileSync(
  new URL("../src/source-checks.json", import.meta.url),
  JSON.stringify(checks, null, 2) + "\n",
);
console.log(
  "Dostępność HTTP nie jest weryfikacją warunków pomocy; verifiedAt pozostaje puste do przeglądu treści.",
);
