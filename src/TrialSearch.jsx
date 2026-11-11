import { mapStudies } from "./validation";
import React, { useRef, useState, useEffect } from "react";
export default function TrialSearch({ notify, saved, setSaved }) {
  const [query, Q] = useState(""),
    [consent, C] = useState(false),
    [state, S] = useState("idle"),
    [results, R] = useState([]),
    [error, E] = useState("");
  const request = useRef(null);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );
  async function search(e) {
    e.preventDefault();
    if (!consent || !query.trim()) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    S("loading");
    R([]);
    E("");
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const params = new URLSearchParams({
        "query.cond": query.trim(),
        pageSize: "10",
        format: "json",
      });
      const response = await fetch(
        "https://clinicaltrials.gov/api/v2/studies?" + params,
        {
          signal: controller.signal,
          referrerPolicy: "no-referrer",
          credentials: "omit",
        },
      );
      if (!response.ok)
        throw Error(
          "Rejestr jest obecnie niedostępny. Spróbuj później lub otwórz oficjalną stronę.",
        );
      const data = await response.json();
      if (!Array.isArray(data.studies))
        throw Error("Nieprawidłowa odpowiedź rejestru.");
      const retrieved = new Date().toISOString();
      if (request.current !== controller) return;
      R(mapStudies(data, retrieved));
      S("done");
    } catch (e) {
      if (request.current !== controller) return;
      E(
        e.name === "AbortError"
          ? "Przekroczono czas oczekiwania. Spróbuj ponownie."
          : e instanceof TypeError
            ? "Nie udało się połączyć z rejestrem. Sprawdź dostęp do sieci."
            : e.message || "Nie udało się połączyć z rejestrem.",
      );
      S("error");
    } finally {
      clearTimeout(timer);
    }
  }
  return (
    <section className="live-search card">
      <div className="section-heading">
        <div>
          <h3>Badania kliniczne — oficjalny rejestr</h3>
          <p>
            Wyniki z ClinicalTrials.gov. Badanie kliniczne nie jest potwierdzoną
            opcją leczenia.
          </p>
        </div>
        <span className="status">Źródło zewnętrzne</span>
      </div>
      <form onSubmit={search}>
        <label htmlFor="trial-query">Rozpoznanie lub hasło po angielsku</label>
        <div className="search-line">
          <input
            id="trial-query"
            maxLength={160}
            value={query}
            onChange={(e) => {
              Q(e.target.value);
              request.current?.abort();
              request.current = null;
              R([]);
              E("");
              S("idle");
            }}
            placeholder="Np. cystic fibrosis"
            required
          />
          <button
            className="primary"
            disabled={!consent || !query.trim() || state === "loading"}
          >
            {state === "loading" ? "Wyszukiwanie…" : "Szukaj w rejestrze"}
          </button>
        </div>
        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              C(e.target.checked);
              if (!e.target.checked) {
                request.current?.abort();
                request.current = null;
                S("idle");
                R([]);
                E("");
              }
            }}
          />
          Zgadzam się przekazać to hasło do ClinicalTrials.gov. Nie wpisuję
          danych osobowych.
        </label>
      </form>
      <div aria-live="polite">
        {state === "error" && (
          <p className="error">
            {error}{" "}
            <a
              target="_blank"
              rel="noreferrer"
              href={
                "https://clinicaltrials.gov/search?cond=" +
                encodeURIComponent(query)
              }
            >
              Otwórz rejestr
            </a>
          </p>
        )}
        {state === "done" && !results.length && (
          <p>
            Brak wyników. Spróbuj innej nazwy rozpoznania. Nie oznacza to braku
            możliwości leczenia.
          </p>
        )}
      </div>
      {results.map((r) => (
        <article className="trial-result" key={r.id}>
          <span className="eyebrow">
            {r.id} · {r.description}
          </span>
          <h4>
            <a href={r.url} target="_blank" rel="noreferrer">
              {r.name}
            </a>
          </h4>
          {r.locations?.length > 0 && <p>{r.locations.join(" · ")}</p>}
          <p className="muted">
            Aktualizacja wpisu: {r.updated || "brak daty"} · Pobrano:{" "}
            {new Date(r.retrieved).toLocaleString("pl-PL", {
              timeZone: "Europe/Warsaw",
            })}
          </p>
          <button
            className="outline"
            disabled={!!saved[r.id]}
            onClick={() => {
              setSaved({
                ...saved,
                [r.id]: { status: "Do sprawdzenia", note: "", source: r },
              });
              notify("Zapisano badanie w poszukiwaniach.");
            }}
          >
            {saved[r.id] ? "Zapisano" : "Zapisz do sprawdzenia"}
          </button>
        </article>
      ))}
    </section>
  );
}
