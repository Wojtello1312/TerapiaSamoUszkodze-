import React, { useEffect, useRef, useState } from "react";
import { encryptBackup, decryptBackup } from "./vault";
async function api(path, method = "GET", body) {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error(
      "Serwer kont jest niedostępny. Uruchom backend i spróbuj ponownie.",
    );
  }
  if (!response.ok)
    throw Object.assign(Error(data.error || "Błąd połączenia."), {
      status: response.status,
    });
  return data;
}
const roles = { owner: "Właściciel", editor: "Edytor", viewer: "Obserwator" };
export default function AccountPanel({
  data,
  dirty,
  notify,
  onImported,
  onSynced,
  clearSignal,
}) {
  const [user, U] = useState(null),
    [login, L] = useState(""),
    [password, P] = useState(""),
    [mode, M] = useState("login"),
    [error, E] = useState(""),
    [busy, B] = useState(false),
    [workspaces, W] = useState([]),
    [active, A] = useState(null),
    [passphrase, K] = useState(""),
    [title, T] = useState("Moja sprawa"),
    [members, MM] = useState([]),
    [invite, I] = useState(""),
    [role, R] = useState("viewer");
  const latest = useRef(data);
  latest.current = data;
  const epoch = useRef(0);
  useEffect(() => {
    const id = ++epoch.current;
    api("/me")
      .then((r) => {
        if (epoch.current === id) {
          U(r.user);
          refresh();
        }
      })
      .catch((e) => {
        if (epoch.current === id && e.status !== 401) E(e.message);
      });
    return () => {
      epoch.current++;
    };
  }, []);
  useEffect(() => {
    K("");
    P("");
  }, [clearSignal]);
  async function refresh() {
    const r = await api("/workspaces");
    W(r.workspaces);
  }
  async function perform(fn) {
    if (busy) return;
    B(true);
    E("");
    try {
      await fn();
    } catch (e) {
      if (e.status === 401) {
        U(null);
        W([]);
        A(null);
        MM([]);
        K("");
      }
      E(e.message);
    } finally {
      B(false);
    }
  }
  async function open(w) {
    const snapshot = latest.current;
    if (
      dirty &&
      !window.confirm(
        "Pobranie zastąpi niezapisane zmiany w otwartej pracy. Kontynuować?",
      )
    )
      return;
    const remote = await api("/workspaces/" + w.id);
    const restored = await decryptBackup(remote.blob, passphrase);
    if (latest.current !== snapshot)
      throw Error("W trakcie pobierania zmieniono pracę. Pobierz ponownie.");
    onImported(restored);
    A(remote);
    MM([]);
    K("");
    notify("Pobrano i odszyfrowano sprawę.");
  }
  return (
    <section className="card content-card settings-block">
      <div className="section-heading">
        <h3>Konto i współpraca</h3>
        <span className="status">{user ? user.username : "Bez logowania"}</span>
      </div>
      <p>
        Konto daje dostęp do spraw na serwerze. Treść spraw jest szyfrowana w
        przeglądarce osobnym hasłem; nazwy spraw i loginy są widoczne dla
        serwera. Używaj neutralnej nazwy sprawy.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            perform(async () => {
              const r = await api("/" + mode, "POST", {
                username: login,
                password,
              });
              U(r.user);
              P("");
              await refresh();
              notify(mode === "login" ? "Zalogowano." : "Utworzono konto.");
            });
          }}
        >
          <div className="button-row">
            <button
              type="button"
              className={mode === "login" ? "primary" : "outline"}
              onClick={() => M("login")}
            >
              Logowanie
            </button>
            <button
              type="button"
              className={mode === "register" ? "primary" : "outline"}
              onClick={() => M("register")}
            >
              Nowe konto
            </button>
          </div>
          <label htmlFor="account-login">Login konta</label>
          <input
            id="account-login"
            autoComplete="username"
            pattern="[a-zA-Z0-9._-]{3,40}"
            required
            value={login}
            onChange={(e) => L(e.target.value)}
          />
          <label htmlFor="account-password">
            Hasło konta (minimum 12 znaków)
          </label>
          <input
            id="account-password"
            type="password"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            minLength={12}
            maxLength={256}
            required
            value={password}
            onChange={(e) => P(e.target.value)}
          />
          <button className="primary" disabled={busy}>
            {busy
              ? "Łączenie…"
              : mode === "login"
                ? "Zaloguj się"
                : "Utwórz konto"}
          </button>
          <p className="info">
            Konta pilotażowe używają loginu, bez e-maila. Odzyskiwanie hasła
            konta nie jest jeszcze dostępne. Zapomnianego hasła szyfrowania nie
            może odzyskać administrator.
          </p>
        </form>
      ) : (
        <>
          <div className="button-row">
            <button
              className="outline"
              disabled={busy}
              onClick={() => perform(refresh)}
            >
              Odśwież listę spraw
            </button>
            <button
              className="outline"
              disabled={busy}
              onClick={() =>
                perform(async () => {
                  await api("/logout", "POST", {});
                  U(null);
                  W([]);
                  A(null);
                  MM([]);
                  K("");
                  notify(
                    "Wylogowano. Otwarta praca pozostaje na urządzeniu; wyczyść sesję, aby usunąć ją z ekranu.",
                  );
                })
              }
            >
              Wyloguj się
            </button>
          </div>
          <label htmlFor="sync-key">
            Hasło szyfrowania sprawy (osobne od hasła konta)
          </label>
          <input
            id="sync-key"
            type="password"
            autoComplete="off"
            value={passphrase}
            onChange={(e) => K(e.target.value)}
          />
          <p className="muted">
            Udostępnij hasło współpracownikowi osobnym, uzgodnionym kanałem. Nie
            wpisuj go w nazwie sprawy.
          </p>
          <div className="workspace-list">
            {workspaces.length ? (
              workspaces.map((w) => (
                <div className="contact-row" key={w.id}>
                  <div>
                    <strong>{w.title}</strong>
                    <p>
                      {roles[w.role]} · wersja {w.version}
                    </p>
                  </div>
                  <button
                    className="outline"
                    disabled={busy || !passphrase}
                    onClick={() => perform(() => open(w))}
                  >
                    Otwórz sprawę
                  </button>
                </div>
              ))
            ) : (
              <p className="empty">Nie masz jeszcze spraw na serwerze.</p>
            )}
          </div>
          <label htmlFor="workspace-title">Nazwa nowej sprawy</label>
          <input
            id="workspace-title"
            value={title}
            maxLength={100}
            onChange={(e) => T(e.target.value)}
          />
          <div className="button-row">
            <button
              className="primary"
              disabled={busy || passphrase.length < 12 || !title.trim()}
              onClick={() =>
                perform(async () => {
                  const snapshot = latest.current;
                  const blob = await encryptBackup(snapshot, passphrase);
                  const r = await api("/workspaces", "POST", { title, blob });
                  A({ ...r, title, role: "owner" });
                  MM([]);
                  K("");
                  onSynced(snapshot);
                  await refresh();
                  notify("Utworzono zaszyfrowaną sprawę na serwerze.");
                })
              }
            >
              Utwórz sprawę z otwartej pracy
            </button>
          </div>
          {active && (
            <>
              <hr />
              <h3>Otwarta sprawa: {active.title}</h3>
              <p>
                {roles[active.role]} · pobrana wersja {active.version}
              </p>
              <div className="button-row">
                <button
                  className="primary"
                  disabled={
                    busy || active.role === "viewer" || passphrase.length < 12
                  }
                  onClick={() =>
                    perform(async () => {
                      const snapshot = latest.current;
                      const remote = await api("/workspaces/" + active.id);
                      await decryptBackup(remote.blob, passphrase);
                      const blob = await encryptBackup(snapshot, passphrase);
                      const r = await api("/workspaces/" + active.id, "PUT", {
                        version: active.version,
                        blob,
                      });
                      A({ ...active, ...r });
                      K("");
                      onSynced(snapshot);
                      await refresh();
                      notify("Zapisano zmiany na serwerze.");
                    })
                  }
                >
                  Wyślij zmiany
                </button>
                <button
                  className="outline"
                  disabled={busy || !passphrase}
                  onClick={() => perform(() => open(active))}
                >
                  Pobierz aktualną kopię
                </button>
              </div>
              {active.role === "viewer" && (
                <p className="info">
                  Możesz czytać sprawę i edytować roboczą kopię lokalnie. Serwer
                  nie pozwoli zapisać zmian w tej sprawie.
                </p>
              )}
              {active.role === "owner" && (
                <>
                  <h3>Dostęp współpracowników</h3>
                  <p>
                    Edytor może pobierać i zapisywać; obserwator tylko pobiera.
                    Odebranie dostępu blokuje kolejne pobrania, ale nie usuwa
                    już pobranych kopii.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      perform(async () => {
                        await api(
                          "/workspaces/" + active.id + "/members",
                          "POST",
                          { username: invite, role },
                        );
                        I("");
                        MM(
                          (await api("/workspaces/" + active.id + "/members"))
                            .members,
                        );
                        notify("Zaktualizowano dostęp.");
                      });
                    }}
                  >
                    <label htmlFor="member-login">
                      Login istniejącego konta
                    </label>
                    <input
                      id="member-login"
                      value={invite}
                      required
                      onChange={(e) => I(e.target.value)}
                    />
                    <label htmlFor="member-role">Uprawnienia</label>
                    <select
                      id="member-role"
                      value={role}
                      onChange={(e) => R(e.target.value)}
                    >
                      <option value="viewer">Obserwator — odczyt</option>
                      <option value="editor">Edytor — odczyt i zapis</option>
                    </select>
                    <button className="outline" disabled={busy}>
                      Nadaj lub zmień dostęp
                    </button>
                  </form>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      perform(async () =>
                        MM(
                          (await api("/workspaces/" + active.id + "/members"))
                            .members,
                        ),
                      )
                    }
                  >
                    Pokaż osoby z dostępem
                  </button>
                  {members.map((m) => (
                    <div className="contact-row" key={m.id}>
                      <span>
                        {m.username} · {roles[m.role]}
                      </span>
                      {m.role !== "owner" && (
                        <button
                          className="outline"
                          disabled={busy}
                          onClick={() =>
                            perform(async () => {
                              await api(
                                "/workspaces/" + active.id + "/members/" + m.id,
                                "DELETE",
                                {},
                              );
                              MM(members.filter((x) => x.id !== m.id));
                            })
                          }
                        >
                          Odbierz dostęp
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="button-row">
                    <button
                      className="outline"
                      disabled={busy}
                      onClick={() =>
                        perform(async () => {
                          if (
                            !window.confirm(
                              "Trwale usunąć tę sprawę z serwera dla wszystkich współpracowników?",
                            )
                          )
                            return;
                          await api("/workspaces/" + active.id, "DELETE", {});
                          A(null);
                          MM([]);
                          await refresh();
                          notify(
                            "Usunięto sprawę z serwera. Otwarta kopia lokalna pozostaje dostępna.",
                          );
                        })
                      }
                    >
                      Usuń sprawę z serwera
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
