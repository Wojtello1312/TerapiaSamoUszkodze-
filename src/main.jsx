import BackupTools from "./BackupTools";
import AccountPanel from "./AccountPanel";
import PilotPanel from "./PilotPanel";
import { useDialog } from "./useDialog";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Plus,
  Check,
  X,
  Menu,
  ArrowUpRight,
  Copy,
} from "lucide-react";
import SupportCenter from "./SupportCenter";
import { saveVault, loadVault, deleteVault, hasVault } from "./vault";
import "./style.css";
const empty = {
  profile: { title: "", goal: "", raised: "" },
  tasks: [],
  contacts: [],
  facts: "",
  draft: "",
  topic: "Aktualizacja zbiórki",
  saved: {},
};
function App() {
  const [data, setData] = useState(empty),
    [page, P] = useState("Przegląd"),
    [modal, M] = useState(""),
    [name, A] = useState(""),
    [email, E] = useState(""),
    [toast, N] = useState(""),
    [menu, U] = useState(false),
    [password, W] = useState(""),
    [busy, B] = useState(false),
    [vault, V] = useState(() => {
      try {
        return hasVault();
      } catch {
        return false;
      }
    }),
    [dirty, H] = useState(false),
    [sessionKey, resetSession] = useState(0);
  const latestData = useRef(data);
  latestData.current = data;
  const revision = useRef(0);
  const noticeTimer = useRef(null);
  useDialog(!!modal, () => M(""));
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  const update = (k, v) => {
    revision.current++;
    setData((d) => ({ ...d, [k]: typeof v === "function" ? v(d[k]) : v }));
    H(true);
  };
  const notify = (t) => {
      clearTimeout(noticeTimer.current);
      N(t);
      noticeTimer.current = setTimeout(() => N(""), 5000);
    },
    nav = (p) => {
      P(p);
      U(false);
    },
    open = (m) => {
      A("");
      E("");
      M(m);
    },
    done = data.tasks.filter((t) => t.done).length;
  const navs = [
    "Przegląd",
    "Poszukiwania",
    "Zadania",
    "Posty",
    "Kontakty",
    "Zbiórka",
    "Pilotaż",
  ];
  async function vaultAction(action) {
    if (busy) return;
    if (
      action === "load" &&
      dirty &&
      !window.confirm(
        "Otworzenie kopii zastąpi niezapisane zmiany. Kontynuować?",
      )
    )
      return;
    const started = revision.current;
    B(true);
    try {
      if (action === "save") {
        await saveVault(data, password);
        V(true);
        H(revision.current !== started);
        notify(
          revision.current === started
            ? "Zapisano zaszyfrowaną kopię na tym urządzeniu."
            : "Zapisano kopię. Późniejsze zmiany wymagają kolejnego zapisu.",
        );
      } else {
        const restored = await loadVault(password);
        if (revision.current !== started)
          throw Error("W trakcie otwierania zmieniono dane. Spróbuj ponownie.");
        setData(restored);
        resetSession((k) => k + 1);
        H(false);
        notify("Otwarto zapis.");
      }
      W("");
    } catch (e) {
      notify(e.message);
    } finally {
      B(false);
    }
  }
  const taskList = (
    <div className="task-list">
      {data.tasks.length ? (
        data.tasks.map((t, i) => (
          <div className={"task " + (t.done ? "done" : "")} key={i}>
            <button
              className="checkbox"
              aria-label={"Zmień status: " + t.title}
              aria-pressed={t.done}
              onClick={() =>
                update(
                  "tasks",
                  data.tasks.map((x, j) =>
                    j === i ? { ...x, done: !x.done } : x,
                  ),
                )
              }
            >
              {t.done && <Check size={14} />}
            </button>
            <div>
              <strong>{t.title}</strong>
              <p>{t.detail}</p>
            </div>
            <button
              className="delete-button"
              aria-label={"Usuń zadanie: " + t.title}
              onClick={() =>
                update(
                  "tasks",
                  data.tasks.filter((_, j) => j !== i),
                )
              }
            >
              <X size={15} />
            </button>
          </div>
        ))
      ) : (
        <div className="empty">
          <h4>Nie masz jeszcze zadań.</h4>
          <p>Dodaj własne lub wybierz kolejny krok w poszukiwaniach.</p>
        </div>
      )}
    </div>
  );
  return (
    <div className="app">
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            nav("Przegląd");
          }}
        >
          blisko<span> / </span>
        </a>
        <p className="brand-caption">Organizacja wsparcia</p>
        <nav>
          {navs.map((n, i) => (
            <button
              key={n}
              aria-label={n}
              className={"nav-item " + (page === n ? "active" : "")}
              onClick={() => nav(n)}
            >
              <span className="nav-number">0{i + 1}</span>
              {n}
              {n === "Zadania" && data.tasks.length > 0 && (
                <span className="count">{data.tasks.length - done}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <span className="eyebrow">TWOJA PRZESTRZEŃ</span>
            <p>
              Informacje, kontakty
              <br />i kolejne kroki.
            </p>
          </div>
          <button
            className={"nav-item " + (page === "Ustawienia" ? "active" : "")}
            onClick={() => nav("Ustawienia")}
          >
            Ustawienia i zapis
          </button>
          <small>Wersja pilotażowa</small>
        </div>
      </aside>
      <div className="main-shell">
        <header>
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Menu"
              onClick={() => U(!menu)}
            >
              <Menu size={20} />
            </button>
            <span>Moja przestrzeń</span>
            <span>/</span>
            <strong>{page}</strong>
          </div>
          <button className="save-indicator" onClick={() => nav("Ustawienia")}>
            <i className={dirty ? "unsaved" : ""} />
            {dirty
              ? "Niezapisane zmiany"
              : vault
                ? "Kopia na urządzeniu"
                : "Zapis nieaktywny"}
            <ArrowUpRight size={13} />
          </button>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">PRZESTRZEŃ OPIEKUNA</p>
              <h1>
                {page === "Przegląd" ? "Mniej spraw do zapamiętania." : page}
              </h1>
              <p>
                {page === "Przegląd"
                  ? "Zbierz w jednym miejscu to, co pomaga działać."
                  : "Porządkuj informacje i wracaj do nich w swoim tempie."}
              </p>
            </div>
            <button className="primary" onClick={() => open("task")}>
              <Plus size={16} />
              Dodaj zadanie
            </button>
          </div>
          {page === "Przegląd" && (
            <>
              <section className="overview-intro">
                <div>
                  <span className="eyebrow">OD CZEGO ZACZĄĆ</span>
                  <h2>
                    Znajdź właściwe miejsce.
                    <br />
                    Zaplanuj kolejny krok.
                  </h2>
                  <p>
                    Źródła wsparcia finansowego i informacje o leczeniu.
                    <br />
                    Zapisane kontakty, notatki i zapytania — w jednej
                    przestrzeni.
                  </p>
                  <button
                    className="primary"
                    onClick={() => nav("Poszukiwania")}
                  >
                    Przejdź do poszukiwań <ArrowRight size={16} />
                  </button>
                </div>
                <div className="intro-index">
                  <span>01 / Poszukaj możliwości</span>
                  <span>02 / Zapisz i sprawdź źródło</span>
                  <span>03 / Przygotuj zapytanie</span>
                </div>
              </section>
              <section className="summary-row">
                {[
                  ["Otwarte zadania", data.tasks.length - done, "Zadania"],
                  [
                    "Zapisane źródła",
                    Object.keys(data.saved).length,
                    "Poszukiwania",
                  ],
                  ["Kontakty", data.contacts.length, "Kontakty"],
                ].map(([label, n, target]) => (
                  <button onClick={() => nav(target)} key={label}>
                    <span>{label}</span>
                    <strong>{String(n).padStart(2, "0")}</strong>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </section>
              <div className="dashboard-grid">
                <section className="card content-card">
                  <div className="section-heading">
                    <h3>Najbliższe zadania</h3>
                    <button
                      className="text-button"
                      onClick={() => nav("Zadania")}
                    >
                      Wszystkie <ArrowRight size={15} />
                    </button>
                  </div>
                  {taskList}
                </section>
                <section className="card content-card">
                  <span className="eyebrow">KOMUNIKACJA</span>
                  <h3 className="feature-heading">
                    Przygotuj wiadomość
                    <br />
                    bez zaczynania od nowa.
                  </h3>
                  <p>
                    Szkic aktualizacji, prośby o wsparcie lub podziękowania. Do
                    sprawdzenia i edycji przed publikacją.
                  </p>
                  <button className="outline" onClick={() => nav("Posty")}>
                    Otwórz szkice <ArrowRight size={14} />
                  </button>
                </section>
              </div>
            </>
          )}
          <div hidden={page !== "Poszukiwania"}>
            <SupportCenter
              key={sessionKey}
              notify={notify}
              saved={data.saved}
              setSaved={(v) => update("saved", v)}
              addTask={(s) => {
                if (data.tasks.some((t) => t.title === "Sprawdź: " + s.name))
                  return notify("To zadanie jest już na liście.");
                update("tasks", [
                  ...data.tasks,
                  { title: "Sprawdź: " + s.name, detail: s.next, done: false },
                ]);
                notify("Dodano zadanie.");
              }}
            />
          </div>
          {page === "Zadania" && (
            <section className="card content-card">
              <div className="section-heading">
                <h3>Lista zadań</h3>
                <span className="muted">
                  Wykonano {done} z {data.tasks.length}
                </span>
              </div>
              {taskList}
            </section>
          )}
          {page === "Posty" && (
            <div className="editor-grid">
              <section className="card content-card">
                <h3>Przygotuj szkic</h3>
                <p>
                  Tekst powstaje z szablonu i podanych faktów. Nie jest
                  publikowany automatycznie.
                </p>
                <label htmlFor="topic">Rodzaj posta</label>
                <select
                  id="topic"
                  value={data.topic}
                  onChange={(e) => update("topic", e.target.value)}
                >
                  {[
                    "Aktualizacja zbiórki",
                    "Prośba o wsparcie",
                    "Podziękowanie",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <label htmlFor="facts">Co chcesz przekazać?</label>
                <textarea
                  id="facts"
                  rows={7}
                  value={data.facts}
                  onChange={(e) => update("facts", e.target.value)}
                  placeholder="Dodaj fakty, które chcesz upublicznić. Bez dokumentacji medycznej."
                />
                <button
                  className="primary"
                  disabled={!data.facts.trim()}
                  onClick={() =>
                    update(
                      "draft",
                      `${data.topic === "Podziękowanie" ? "Dziękujemy za dotychczasowe wsparcie." : data.topic === "Prośba o wsparcie" ? "Prosimy o wsparcie naszej zbiórki." : "Aktualizacja naszej zbiórki."}\n\n${data.facts.trim()}\n\nDziękujemy za wpłaty i udostępnienia.\n[Dodaj zweryfikowany link do zbiórki]`,
                    )
                  }
                >
                  Przygotuj szkic <ArrowRight size={15} />
                </button>
              </section>
              <section className="card content-card">
                <h3>Do sprawdzenia</h3>
                {data.draft ? (
                  <>
                    <label htmlFor="draft">Treść posta</label>
                    <textarea
                      id="draft"
                      rows={13}
                      value={data.draft}
                      onChange={(e) => update("draft", e.target.value)}
                    />
                    <button
                      className="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(data.draft);
                          notify("Skopiowano tekst.");
                        } catch {
                          notify("Zaznacz tekst i skopiuj go ręcznie.");
                        }
                      }}
                    >
                      <Copy size={15} />
                      Kopiuj tekst
                    </button>
                  </>
                ) : (
                  <div className="empty">
                    <p>Tutaj pojawi się szkic. Możesz go dowolnie edytować.</p>
                  </div>
                )}
              </section>
            </div>
          )}
          {page === "Kontakty" && (
            <section className="card content-card">
              <div className="section-heading">
                <h3>Osoby i organizacje</h3>
                <button className="outline" onClick={() => open("contact")}>
                  <Plus size={15} />
                  Dodaj kontakt
                </button>
              </div>
              {data.contacts.length ? (
                data.contacts.map((c, i) => (
                  <div className="contact-row" key={i}>
                    <div>
                      <strong>{c.name}</strong>
                      <p>{c.email}</p>
                    </div>
                    <button
                      className="delete-button"
                      aria-label={"Usuń kontakt: " + c.name}
                      onClick={() =>
                        update(
                          "contacts",
                          data.contacts.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <h4>Twoje kontakty pojawią się tutaj.</h4>
                  <p>
                    Dodaj osobę, fundację lub organizację. Panel nie wysyła
                    wiadomości.
                  </p>
                </div>
              )}
            </section>
          )}
          {page === "Zbiórka" && (
            <section className="card content-card narrow">
              <h3>Podstawowe informacje</h3>
              <p>
                Wpisz informacje robocze. Kwoty nie są synchronizowane z
                platformą zbiórki.
              </p>
              {[
                ["Nazwa zbiórki", "title", "text"],
                ["Cel (zł)", "goal", "number"],
                ["Zebrana kwota (zł)", "raised", "number"],
              ].map(([label, key, type]) => (
                <React.Fragment key={key}>
                  <label htmlFor={key}>{label}</label>
                  <input
                    id={key}
                    type={type}
                    min="0"
                    step="0.01"
                    value={data.profile[key]}
                    onChange={(e) => {
                      if (
                        type === "number" &&
                        e.target.value !== "" &&
                        (!Number.isFinite(Number(e.target.value)) ||
                          Number(e.target.value) < 0)
                      )
                        return;
                      update("profile", {
                        ...data.profile,
                        [key]: e.target.value,
                      });
                    }}
                  />
                </React.Fragment>
              ))}
            </section>
          )}
          <div hidden={page !== "Pilotaż"}>
            <PilotPanel />
          </div>
          <div hidden={page !== "Ustawienia"}>
            <AccountPanel
              data={data}
              dirty={dirty}
              clearSignal={sessionKey}
              notify={notify}
              onImported={(restored) => {
                revision.current++;
                setData(restored);
                resetSession((k) => k + 1);
                H(false);
              }}
              onSynced={(snapshot) => {
                if (latestData.current === snapshot) H(false);
              }}
            />
          </div>
          {page === "Ustawienia" && (
            <section className="card content-card narrow">
              <h3>Zaszyfrowany zapis na urządzeniu</h3>
              <p>
                Możesz zapisać bieżącą pracę w tej przeglądarce. Kopia jest
                szyfrowana hasłem, którego nie przechowujemy. Zapis wykonujesz
                ręcznie po zmianach. Do aktualizacji kopii potrzebne jest jej
                dotychczasowe hasło.
              </p>
              <div className="info">
                To nie jest konto ani kopia w chmurze. Wyczyszczenie danych
                przeglądarki usuwa zapis; zapomnianego hasła nie można odzyskać.
                Inne osoby korzystające z otwartej strony mają dostęp do
                odblokowanej pracy. Nie przechowuj tu dokumentacji medycznej.
              </div>
              <label htmlFor="vault-password">
                Hasło zapisu (co najmniej 12 znaków)
              </label>
              <input
                id="vault-password"
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => W(e.target.value)}
              />
              <div className="button-row">
                <button
                  className="primary"
                  disabled={busy || password.length < 12}
                  onClick={() => vaultAction("save")}
                >
                  {busy
                    ? "Przetwarzanie…"
                    : vault
                      ? "Zapisz zmiany w kopii"
                      : "Zapisz zaszyfrowaną kopię"}
                </button>
                {vault && (
                  <button
                    className="outline"
                    disabled={busy || !password}
                    onClick={() => vaultAction("load")}
                  >
                    Otwórz zapis
                  </button>
                )}
              </div>
              <p className="muted">
                {dirty
                  ? "Masz zmiany, które nie są zapisane."
                  : "Brak nowych zmian w bieżącej sesji."}
              </p>
              <BackupTools
                key={sessionKey}
                data={data}
                dirty={dirty}
                notify={notify}
                onImported={(restored) => {
                  revision.current++;
                  setData(restored);
                  V(true);
                  W("");
                  resetSession((k) => k + 1);
                  H(false);
                }}
                onVaultChanged={() => {
                  V(true);
                  W("");
                }}
              />
              <hr />
              <h3>Usuwanie danych</h3>
              <p>
                Usunięcie kopii nie usuwa otwartej pracy. Wyczyść także sesję,
                aby usunąć ją z ekranu.
              </p>
              <div className="button-row">
                <button
                  className="outline"
                  disabled={busy || !vault}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Trwale usunąć zapisaną kopię z tego urządzenia?",
                      )
                    )
                      return;
                    try {
                      deleteVault();
                      V(false);
                      notify("Usunięto zapisaną kopię.");
                    } catch {
                      notify("Przeglądarka zablokowała usunięcie kopii.");
                    }
                  }}
                >
                  Usuń kopię z urządzenia
                </button>
                <button
                  className="outline"
                  disabled={busy}
                  onClick={() => {
                    if (
                      dirty &&
                      !window.confirm(
                        "Usunąć niezapisane zmiany z otwartej sesji?",
                      )
                    )
                      return;
                    revision.current++;
                    setData(empty);
                    resetSession((k) => k + 1);
                    W("");
                    A("");
                    E("");
                    M("");
                    H(false);
                    notify("Wyczyszczono otwartą sesję.");
                  }}
                >
                  Wyczyść sesję
                </button>
              </div>
            </section>
          )}
          <footer>
            <strong>blisko</strong>
            <span>Organizacja wsparcia dla opiekunów</span>
            <button onClick={() => nav("Ustawienia")}>
              Prywatność i zapis <ArrowUpRight size={12} />
            </button>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => M("")}>
          <section
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-label={modal === "task" ? "Nowe zadanie" : "Nowy kontakt"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close icon-button"
              aria-label="Zamknij"
              onClick={() => M("")}
            >
              <X size={18} />
            </button>
            <h2>{modal === "task" ? "Nowe zadanie" : "Nowy kontakt"}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                update(
                  modal === "task" ? "tasks" : "contacts",
                  modal === "task"
                    ? [
                        ...data.tasks,
                        { title: name.trim(), detail: "", done: false },
                      ]
                    : [...data.contacts, { name: name.trim(), email }],
                );
                M("");
                notify("Dodano.");
              }}
            >
              <label htmlFor="entry-name">
                {modal === "task"
                  ? "Co chcesz zrobić?"
                  : "Osoba lub organizacja"}
              </label>
              <input
                id="entry-name"
                required
                maxLength={160}
                value={name}
                onChange={(e) => A(e.target.value)}
              />
              {modal === "contact" && (
                <>
                  <label htmlFor="entry-email">Adres e-mail</label>
                  <input
                    id="entry-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => E(e.target.value)}
                  />
                </>
              )}
              <button className="primary" disabled={!name.trim()}>
                Dodaj <Plus size={15} />
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
