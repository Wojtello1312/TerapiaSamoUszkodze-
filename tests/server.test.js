import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { encryptBackup } from "../src/vault.js";
const workspace = {
  profile: { title: "Testowa sprawa", goal: "", raised: "" },
  tasks: [],
  contacts: [],
  facts: "",
  draft: "",
  topic: "",
  saved: {},
};
const origin = "http://localhost:5173";
test("accounts, encrypted sync, isolation, permissions, conflict detection, revocation and logout", async (t) => {
  const app = createApp();
  await new Promise((r) => app.listen(0, "127.0.0.1", r));
  t.after(() => {
    app.closeAllConnections();
    app.close();
  });
  const url = `http://127.0.0.1:${app.address().port}`;
  async function call(path, method = "GET", body, token, extra = {}) {
    const r = await fetch(url + "/api" + path, {
      method,
      headers: {
        Origin: origin,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Cookie: token } : {}),
        ...extra,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
      headers: r.headers,
    };
  }
  const owner = await call("/register", "POST", {
    username: "owner",
    password: "Owner-password-123",
  });
  assert.equal(owner.status, 200);
  assert.ok(owner.headers.get("set-cookie").includes("HttpOnly"));
  const reader = await call("/register", "POST", {
      username: "reader",
      password: "Reader-password-123",
    }),
    stranger = await call("/register", "POST", {
      username: "stranger",
      password: "Stranger-password-123",
    });
  assert.equal(
    (
      await call("/login", "POST", {
        username: "owner",
        password: "Wrong-password-123",
      })
    ).status,
    401,
  );
  assert.equal((await call("/workspaces")).status, 401);
  const blob = await encryptBackup(workspace, "Separate-vault-password");
  const created = await call(
    "/workspaces",
    "POST",
    { title: "Neutralna nazwa", blob },
    owner.cookie,
  );
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal(
    (await call("/workspaces/" + id, "GET", undefined, stranger.cookie)).status,
    404,
  );
  assert.equal(
    (await call("/workspaces", "GET", undefined, stranger.cookie)).data
      .workspaces.length,
    0,
  );
  assert.equal(
    (
      await call(
        "/workspaces/" + id + "/members",
        "POST",
        { username: "reader", role: "viewer" },
        owner.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await call("/workspaces/" + id, "GET", undefined, reader.cookie)).data
      .blob,
    blob,
  );
  assert.equal(
    (
      await call(
        "/workspaces/" + id,
        "PUT",
        { version: 1, blob },
        reader.cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        "/workspaces/" + id + "/members",
        "GET",
        undefined,
        reader.cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        "/workspaces/" + id + "/members",
        "POST",
        { username: "reader", role: "editor" },
        owner.cookie,
      )
    ).status,
    200,
  );
  const writes = await Promise.all([
    call("/workspaces/" + id, "PUT", { version: 1, blob }, owner.cookie),
    call("/workspaces/" + id, "PUT", { version: 1, blob }, reader.cookie),
  ]);
  assert.deepEqual(writes.map((x) => x.status).sort(), [200, 409]);
  assert.equal(
    (
      await call(
        "/workspaces/" + id,
        "PUT",
        { version: 2, blob: "plaintext" },
        owner.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "/workspaces/" + id,
        "PUT",
        { version: 2, blob },
        owner.cookie,
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await call("/workspaces/" + id, "DELETE", {}, reader.cookie)).status,
    403,
  );
  assert.equal(
    (
      await call(
        "/workspaces/" + id + "/members/" + reader.data.user.id,
        "DELETE",
        {},
        owner.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await call("/workspaces/" + id, "GET", undefined, reader.cookie)).status,
    404,
  );
  assert.equal(
    (
      await call(
        "/workspaces/" + id + "/members/" + owner.data.user.id,
        "DELETE",
        {},
        owner.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (await call("/workspaces/" + id, "DELETE", {}, owner.cookie)).status,
    200,
  );
  assert.equal(
    (await call("/workspaces/" + id, "GET", undefined, owner.cookie)).status,
    404,
  );
  await call("/logout", "POST", {}, owner.cookie);
  assert.equal((await call("/me", "GET", undefined, owner.cookie)).status, 401);
});
test("production registration can be disabled", async (t) => {
  const app = createApp({ registration: false });
  await new Promise((r) => app.listen(0, "127.0.0.1", r));
  t.after(() => {
    app.closeAllConnections();
    app.close();
  });
  const r = await fetch(`http://127.0.0.1:${app.address().port}/api/register`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test", password: "long-password-123" }),
  });
  assert.equal(r.status, 403);
});

test("sessions expire and production cookies include Secure", async (t) => {
  let time = Date.now();
  const app = createApp({ secure: true, now: () => time });
  await new Promise((r) => app.listen(0, "127.0.0.1", r));
  t.after(() => {
    app.closeAllConnections();
    app.close();
  });
  const base = `http://127.0.0.1:${app.address().port}/api`;
  const r = await fetch(base + "/register", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "expiry",
      password: "Expiry-test-password",
    }),
  });
  const cookie = r.headers.get("set-cookie");
  assert.ok(cookie.includes("; Secure"));
  await r.json();
  time += 43200001;
  const expired = await fetch(base + "/me", {
    headers: { Cookie: cookie.split(";")[0] },
  });
  assert.equal(expired.status, 401);
});
