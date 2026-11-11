import { useDialog } from "./useDialog";
import React, { useState } from "react";
import TrialSearch from "./TrialSearch";
import {
  Search,
  Bookmark,
  ArrowUpRight,
  Check,
  Copy,
  Heart,
  Globe,
  Clock,
  ArrowRight,
} from "lucide-react";
import { sources } from "./sources";
import sourceChecks from "./source-checks.json";

export default function SupportCenter({ notify, addTask, saved, setSaved }) {
  const [area, setArea] = useState("Wszystkie"),
    [region, setRegion] = useState("Wszystkie"),
    [condition, setCondition] = useState(""),
    [view, setView] = useState("sources"),
    [selected, setSelected] = useState(null),
    [message, setMessage] = useState("");
  useDialog(!!selected, () => setSelected(null));
  const allSources = [
    ...sources,
    ...Object.values(saved)
      .filter((x) => x.source)
      .map((x) => x.source),
  ];
  const list = allSources.filter(
    (s) =>
      (area === "Wszystkie" || s.area === area) &&
      (region === "Wszystkie" || s.scope === region) &&
      (view !== "saved" || saved[s.id]),
  );
  function save(s) {
    setSaved({ ...saved, [s.id]: { status: "Do sprawdzenia", note: "" } });
    notify("Dodano do Twoich poszukiwań.");
  }
  function prepare(s) {
    setSelected(s);
    setMessage(
      `Dzień dobry,\n\nKontaktuję się jako opiekun osoby potrzebującej wsparcia. ${s.area === "Wsparcie finansowe" ? "Chciałabym/chciałbym zapytać o dostępne formy pomocy oraz warunki zgłoszenia." : "Chciałabym/chciałbym zapytać o właściwy punkt kontaktu w sprawie informacji o ośrodkach i możliwościach konsultacji."}\n\nProszę o informację, jakie są kryteria oraz kolejne kroki i czy kontaktuję się z właściwą organizacją. Proszę również o wskazanie bezpiecznego sposobu przekazania wymaganych dokumentów.\n\nDziękuję za poświęcony czas.\n[Imię i preferowany sposób kontaktu]`,
    );
  }
  return (
    <div className="support-center">
      <section className="search-intro">
        <div>
          <span className="eyebrow">ŹRÓDŁA I KONTAKTY</span>
          <h2>Poszukiwania wsparcia</h2>
          <p>Fundacje, informacje o leczeniu i historia Twoich poszukiwań.</p>
        </div>
        <div className="search-intro-icon">
          <Search size={42} />
        </div>
      </section>
      <div className="info">
        Katalog organizacji jest statyczny. Formularz badań poniżej pobiera dane
        z rejestru po zatwierdzeniu zapytania. Aktualność stron i warunki pomocy
        nie zostały potwierdzone. Nie oceniamy kwalifikacji do leczenia;
        potwierdza ją placówka i lekarz prowadzący.
      </div>
      <section className="card search-filters">
        <label>
          Jakiej pomocy szukasz?
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option>Wszystkie</option>
            <option>Wsparcie finansowe</option>
            <option>Poszukiwanie leczenia</option>
          </select>
        </label>
        <label>
          Obszar źródeł
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option>Wszystkie</option>
            <option>Polska</option>
            <option>Świat</option>
          </select>
        </label>
        <label>
          Hasło do rejestru badań (opcjonalnie)
          <input
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="Np. nazwa choroby po angielsku"
          />
        </label>
        <a
          className="outline"
          target="_blank"
          rel="noopener noreferrer"
          href={
            "https://clinicaltrials.gov/search?cond=" +
            encodeURIComponent(condition.trim())
          }
        >
          Otwórz rejestr <ArrowUpRight size={15} />
        </a>
      </section>
      <TrialSearch notify={notify} saved={saved} setSaved={setSaved} />
      <div className="search-tabs">
        <button
          className={view === "sources" ? "selected" : ""}
          onClick={() => setView("sources")}
        >
          <Search size={16} />
          Miejsca do sprawdzenia
        </button>
        <button
          className={view === "saved" ? "selected" : ""}
          onClick={() => setView("saved")}
        >
          <Bookmark size={16} />
          Moje poszukiwania <span>{Object.keys(saved).length}</span>
        </button>
      </div>
      <p className="results-description">
        {list.length} punktów startowych ·{" "}
        {view === "saved"
          ? "Zapisz pracę w ustawieniach, aby wrócić do notatek."
          : "Kolejność nie jest rankingiem jakości ani szans na pomoc."}
      </p>
      <div className="source-grid">
        {list.map((s) => (
          <article className="card source-card" key={s.id}>
            <div className="source-meta">
              <span
                className={
                  "stat-icon " +
                  (s.area === "Wsparcie finansowe" ? "green" : "blue")
                }
              >
                {s.area === "Wsparcie finansowe" ? (
                  <Heart size={19} />
                ) : (
                  <Globe size={19} />
                )}
              </span>
              <span>
                {s.area}
                <small>{s.scope}</small>
              </span>
              <span className="unverified">
                {sourceChecks[s.id]?.status === "blocked"
                  ? "Weryfikacja zablokowana"
                  : "Do weryfikacji"}
              </span>
            </div>
            <h3>{s.name}</h3>
            {sourceChecks[s.id] && (
              <p className="muted">
                Próba sprawdzenia:{" "}
                {new Date(sourceChecks[s.id].attemptedAt).toLocaleDateString(
                  "pl-PL",
                  { timeZone: "Europe/Warsaw" },
                )}
                .{" "}
                {sourceChecks[s.id].verifiedAt
                  ? "Zweryfikowano: " + sourceChecks[s.id].verifiedAt
                  : "Treść i warunki pomocy niepotwierdzone."}
              </p>
            )}
            <p>{s.description}</p>
            {s.retrieved && (
              <p className="muted">
                Aktualizacja wpisu: {s.updated || "brak daty"} · Pobrano:{" "}
                {new Date(s.retrieved).toLocaleString("pl-PL", {
                  timeZone: "Europe/Warsaw",
                })}
              </p>
            )}
            <a
              className="source-link"
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {new URL(s.url).hostname}
              <ArrowUpRight size={13} />
            </a>
            <div className="next-step">
              <strong>Następny krok</strong>
              <p>{s.next}</p>
            </div>
            {saved[s.id] && (
              <div className="saved-fields">
                <label>
                  Status
                  <select
                    value={saved[s.id].status}
                    onChange={(e) =>
                      setSaved({
                        ...saved,
                        [s.id]: { ...saved[s.id], status: e.target.value },
                      })
                    }
                  >
                    {[
                      "Do sprawdzenia",
                      "Wysłano zapytanie",
                      "Oczekuję na odpowiedź",
                      "Otrzymano odpowiedź",
                      "Zamknięte",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Twoja notatka
                  <textarea
                    rows={2}
                    placeholder="Np. sprawdzić zasady zgłoszenia. Bez danych medycznych."
                    value={saved[s.id].note}
                    onChange={(e) =>
                      setSaved({
                        ...saved,
                        [s.id]: { ...saved[s.id], note: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            )}
            <div className="source-actions">
              <button className="primary" onClick={() => prepare(s)}>
                Przygotuj zapytanie <ArrowRight size={14} />
              </button>
              <button
                className="outline"
                disabled={!!saved[s.id]}
                onClick={() => save(s)}
              >
                {saved[s.id] ? <Check size={15} /> : <Bookmark size={15} />}{" "}
                {saved[s.id] ? "Zapisano" : "Zapisz trop"}
              </button>
            </div>
            {saved[s.id] && (
              <div className="source-bottom">
                <button onClick={() => addTask(s)}>
                  Dodaj krok do zadań <Clock size={13} />
                </button>
                <button
                  onClick={() => {
                    const next = { ...saved };
                    delete next[s.id];
                    setSaved(next);
                  }}
                >
                  Usuń z listy
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {!list.length && (
        <div className="card empty">
          <Bookmark size={35} />
          <h4>
            {view === "saved"
              ? "Tu zbierzesz swoje tropy"
              : "Brak źródeł dla tych filtrów"}
          </h4>
          <p>
            {view === "saved"
              ? "Zapisz wybrane miejsce, aby śledzić postęp i notatki."
              : "Zmień obszar lub rodzaj pomocy."}
          </p>
          <button
            className="outline"
            onClick={() => {
              setView("sources");
              setArea("Wszystkie");
              setRegion("Wszystkie");
            }}
          >
            Pokaż wszystkie źródła
          </button>
        </div>
      )}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="modal card message-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Szkic zapytania"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close icon-button"
              aria-label="Zamknij"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <h2>Szkic zapytania</h2>
            <p>Adresat: {selected.name}</p>
            <div className="info">
              Szkic powstał z szablonu. Sprawdź adresata na oficjalnej stronie i
              uzupełnij podpis. Nic nie jest wysyłane automatycznie.
            </div>
            <label>
              Treść zapytania
              <textarea
                rows={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <button
              className="primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(message);
                  notify("Skopiowano zapytanie.");
                } catch {
                  notify("Skopiuj tekst ręcznie z pola zapytania.");
                }
              }}
            >
              <Copy size={16} />
              Kopiuj zapytanie
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
