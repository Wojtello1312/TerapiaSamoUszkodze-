import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
  randomUUID,
} from "node:crypto";
import { promisify } from "node:util";
import { parseBackup } from "../src/vault.js";
const scrypt = promisify(scryptCallback),
  hash = (x) => createHash("sha256").update(x).digest("hex");
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
export function createApp({
  dbPath = ":memory:",
  origin = "http://localhost:5173",
  secure = false,
  registration = true,
  now = () => Date.now(),
} = {}) {
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,title TEXT NOT NULL,blob TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS members(workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,role TEXT CHECK(role IN ('owner','editor','viewer')),PRIMARY KEY(workspace_id,user_id));`);
  const limits = new Map();
  const cookie = (token) =>
    `blisko_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure ? "; Secure" : ""}`;
  const query = (sql, ...args) => db.prepare(sql).get(...args),
    all = (sql, ...args) => db.prepare(sql).all(...args);
  const rate = (req) => {
    const ip = req.socket.remoteAddress || "unknown",
      t = now();
    if (limits.size > 10000)
      for (const [k, v] of limits) if (v.until < t) limits.delete(k);
    let v = limits.get(ip);
    if (!v || v.until < t) v = { n: 0, until: t + 600000 };
    v.n++;
    limits.set(ip, v);
    if (v.n > 30) fail(429, "Za dużo prób. Spróbuj ponownie za 10 minut.");
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (req.method === "GET" && path === "/api/health") {
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      let body = {};
      if (!["GET", "HEAD"].includes(req.method)) {
        if (req.headers.origin !== origin)
          fail(403, "Niedozwolone źródło żądania.");
        if (!req.headers["content-type"]?.startsWith("application/json"))
          fail(415, "Wymagany JSON.");
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 5 * 1024 * 1024) fail(413, "Żądanie jest za duże.");
          chunks.push(chunk);
        }
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        } catch {
          fail(400, "Nieprawidłowy JSON.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          fail(400, "Nieprawidłowe dane.");
      }
      const respond = (data, status = 200) => {
        res.statusCode = status;
        res.end(JSON.stringify(data));
      };
      if (
        req.method === "POST" &&
        ["/api/register", "/api/login"].includes(path)
      ) {
        rate(req);
        const username =
          typeof body.username === "string"
            ? body.username.trim().toLowerCase()
            : "";
        if (
          !/^[a-z0-9._-]{3,40}$/.test(username) ||
          typeof body.password !== "string" ||
          body.password.length < 12 ||
          body.password.length > 256
        )
          fail(400, "Login: 3–40 znaków a-z, cyfr, ._-; hasło: 12–256 znaków.");
        let user = query("SELECT * FROM users WHERE username=?", username);
        if (path === "/api/register") {
          if (!registration) fail(403, "Rejestracja jest wyłączona.");
          if (user) fail(409, "Ten login jest niedostępny.");
          const salt = randomBytes(16).toString("hex"),
            password = (await scrypt(body.password, salt, 64)).toString("hex"),
            id = randomUUID();
          try {
            db.prepare("INSERT INTO users VALUES(?,?,?,?)").run(
              id,
              username,
              salt,
              password,
            );
          } catch {
            fail(409, "Ten login jest niedostępny.");
          }
          user = { id, username };
        } else {
          const derived = await scrypt(
            body.password,
            user?.salt || "00000000000000000000000000000000",
            64,
          );
          if (
            !user ||
            !timingSafeEqual(derived, Buffer.from(user.password, "hex"))
          )
            fail(401, "Nieprawidłowy login lub hasło.");
        }
        const old = req.headers.cookie?.match(
          /(?:^|;\s*)blisko_session=([a-f0-9]{64})(?:;|$)/,
        )?.[1];
        if (old)
          db.prepare("DELETE FROM sessions WHERE token=?").run(hash(old));
        db.prepare("DELETE FROM sessions WHERE expires<?").run(now());
        const token = randomBytes(32).toString("hex");
        db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
          hash(token),
          user.id,
          now() + 43200000,
        );
        res.setHeader("Set-Cookie", cookie(token));
        respond({ user: { id: user.id, username: user.username } });
        return;
      }
      const token = req.headers.cookie?.match(
        /(?:^|;\s*)blisko_session=([a-f0-9]{64})(?:;|$)/,
      )?.[1];
      const user =
        token &&
        query(
          "SELECT u.id,u.username FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires>?",
          hash(token),
          now(),
        );
      if (!user) fail(401, "Zaloguj się, aby kontynuować.");
      if (path === "/api/me" && req.method === "GET") {
        respond({ user });
        return;
      }
      if (path === "/api/logout" && req.method === "POST") {
        db.prepare("DELETE FROM sessions WHERE token=?").run(hash(token));
        res.setHeader(
          "Set-Cookie",
          cookie("").replace("Max-Age=43200", "Max-Age=0"),
        );
        respond({ ok: true });
        return;
      }
      if (path === "/api/workspaces" && req.method === "GET") {
        respond({
          workspaces: all(
            "SELECT w.id,w.title,w.version,w.updated,m.role FROM workspaces w JOIN members m ON w.id=m.workspace_id WHERE m.user_id=? ORDER BY w.updated DESC",
            user.id,
          ),
        });
        return;
      }
      function validateBlob() {
        try {
          parseBackup(body.blob);
        } catch {
          fail(400, "Nieprawidłowa zaszyfrowana kopia.");
        }
      }
      if (path === "/api/workspaces" && req.method === "POST") {
        validateBlob();
        if (
          typeof body.title !== "string" ||
          body.title.trim().length < 1 ||
          body.title.length > 100
        )
          fail(400, "Podaj nazwę sprawy (do 100 znaków).");
        const id = randomUUID(),
          updated = new Date(now()).toISOString();
        db.exec("BEGIN");
        try {
          db.prepare("INSERT INTO workspaces VALUES(?,?,?,1,?)").run(
            id,
            body.title.trim(),
            body.blob,
            updated,
          );
          db.prepare("INSERT INTO members VALUES(?,?,?)").run(
            id,
            user.id,
            "owner",
          );
          db.exec("COMMIT");
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
        respond({ id, version: 1, updated }, 201);
        return;
      }
      const match = path.match(
        /^\/api\/workspaces\/([a-f0-9-]+)(\/members(?:\/([a-f0-9-]+))?)?$/,
      );
      if (!match) fail(404, "Nie znaleziono.");
      const id = match[1],
        member = query(
          "SELECT role FROM members WHERE workspace_id=? AND user_id=?",
          id,
          user.id,
        );
      if (!member) fail(404, "Nie znaleziono sprawy lub brak dostępu.");
      if (match[2]) {
        if (member.role !== "owner")
          fail(403, "Tylko właściciel zarządza dostępem.");
        if (req.method === "GET") {
          respond({
            members: all(
              "SELECT u.id,u.username,m.role FROM members m JOIN users u ON m.user_id=u.id WHERE workspace_id=?",
              id,
            ),
          });
          return;
        }
        if (req.method === "POST") {
          if (
            !["editor", "viewer"].includes(body.role) ||
            typeof body.username !== "string"
          )
            fail(400, "Wybierz rolę edytora lub obserwatora.");
          const target = query(
            "SELECT id FROM users WHERE username=?",
            body.username.trim().toLowerCase(),
          );
          if (!target) fail(404, "Użytkownik musi najpierw założyć konto.");
          if (target.id === user.id)
            fail(400, "Nie możesz zmienić roli właściciela.");
          db.prepare(
            "INSERT INTO members VALUES(?,?,?) ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=excluded.role",
          ).run(id, target.id, body.role);
          respond({ ok: true });
          return;
        }
        if (req.method === "DELETE" && match[3]) {
          if (match[3] === user.id) fail(400, "Nie można usunąć właściciela.");
          db.prepare(
            "DELETE FROM members WHERE workspace_id=? AND user_id=?",
          ).run(id, match[3]);
          respond({ ok: true });
          return;
        }
      } else {
        if (req.method === "GET") {
          respond({
            ...query("SELECT * FROM workspaces WHERE id=?", id),
            role: member.role,
          });
          return;
        }
        if (req.method === "PUT") {
          if (member.role === "viewer")
            fail(403, "Masz dostęp tylko do odczytu.");
          validateBlob();
          if (!Number.isSafeInteger(body.version) || body.version < 1)
            fail(400, "Nieprawidłowa wersja.");
          const updated = new Date(now()).toISOString();
          const result = db
            .prepare(
              "UPDATE workspaces SET blob=?,version=version+1,updated=? WHERE id=? AND version=?",
            )
            .run(body.blob, updated, id, body.version);
          if (!result.changes)
            fail(
              409,
              "Ktoś zmienił tę sprawę. Pobierz nowszą kopię przed zapisem. Twoja praca pozostaje na ekranie.",
            );
          respond({ id, version: body.version + 1, updated });
          return;
        }
        if (req.method === "DELETE") {
          if (member.role !== "owner")
            fail(403, "Tylko właściciel może usunąć sprawę.");
          db.prepare("DELETE FROM workspaces WHERE id=?").run(id);
          respond({ ok: true });
          return;
        }
      }
      fail(405, "Niedozwolona metoda.");
    } catch (e) {
      res.statusCode = e.status || 500;
      res.end(
        JSON.stringify({
          error: e.status ? e.message : "Błąd serwera. Spróbuj ponownie.",
        }),
      );
    }
  });
  server.on("close", () => db.close());
  server.headersTimeout = 15000;
  server.requestTimeout = 30000;
  return server;
}
