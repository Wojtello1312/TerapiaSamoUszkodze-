import { mkdirSync, chmodSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createApp } from "./app.js";
const production = process.env.NODE_ENV === "production";
const origin = process.env.APP_ORIGIN || "http://localhost:5173";
if (production && !origin.startsWith("https://"))
  throw Error("Produkcja wymaga APP_ORIGIN z HTTPS.");
const path = resolve(process.env.DATABASE_PATH || "data/blisko.sqlite");
mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
const app = createApp({
  dbPath: path,
  origin,
  secure: production,
  registration: process.env.ALLOW_REGISTRATION === "true" || !production,
});
chmodSync(path, 0o600);
app.listen(
  Number(process.env.PORT || 3001),
  process.env.HOST || "127.0.0.1",
  () => console.log("Blisko API uruchomione."),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => app.close(() => process.exit(0)));
