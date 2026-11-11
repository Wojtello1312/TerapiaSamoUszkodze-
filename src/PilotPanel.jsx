import React, { useState, useEffect } from "react";
const tasks = [
  [
    "source",
    "Znajdź i zapisz źródło pomocy",
    "Znajdź Fundację Dzieciom, zapisz ją i dodaj notatkę „Sprawdzić zasady zgłoszenia”.",
  ],
  [
    "message",
    "Przygotuj zapytanie",
    "Przygotuj zapytanie do wybranej organizacji i zmień podpis na „Osoba testowa”.",
  ],
  [
    "task",
    "Zaplanuj kolejny krok",
    "Dodaj zadanie „Sprawdzić dokumenty” i oznacz je jako wykonane.",
  ],
  [
    "backup",
    "Odtwórz kopię",
    "Zapisz fikcyjną sprawę, wyeksportuj kopię i odtwórz ją z pliku. Użyj wyłącznie hasła testowego.",
  ],
];
export default function PilotPanel() {
  const [consent, C] = useState(false),
    [code, K] = useState("P01"),
    [mode, M] = useState("panel"),
    [task, T] = useState(tasks[0][0]),
    [started, S] = useState(null),
    [elapsed, E] = useState(0),
    [duration, D] = useState(null),
    [outcome, O] = useState("completed"),
    [difficulty, F] = useState("3"),
    [help, H] = useState(false),
    [note, N] = useState(""),
    [records, R] = useState([]);
  useEffect(() => {
    if (started === null) return;
    const timer = setInterval(
      () => E(Math.floor((performance.now() - started) / 1000)),
      300,
    );
    return () => clearInterval(timer);
  }, [started]);
  useEffect(() => {
    if (!records.length && started === null && duration === null) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [records.length, started, duration]);
  const current = tasks.find((t) => t[0] === task);
  return (
    <section className="card content-card narrow">
      <h3>Pilotaż użyteczności</h3>
      <p>
        Formularz dla prowadzącego sesję z dorosłym opiekunem. Używaj fikcyjnej
        sprawy. Nie zapisuj nazwisk, rozpoznań ani haseł. Pomiary pozostają w
        tej karcie; wyeksportuj je przed jej zamknięciem. Nie są częścią kopii
        sprawy.
      </p>
      <label className="consent">
        <input
          type="checkbox"
          checked={consent}
          disabled={started !== null || records.length > 0 || duration !== null}
          onChange={(e) => C(e.target.checked)}
        />
        Uczestnik otrzymał informację o badaniu i dobrowolnie zgodził się na
        anonimowy pomiar. Może przerwać w dowolnej chwili.
      </label>
      <label htmlFor="pilot-code">Kod uczestnika (bez nazwiska)</label>
      <input
        id="pilot-code"
        value={code}
        pattern="[A-Za-z0-9_-]{1,20}"
        maxLength={20}
        disabled={started !== null || records.length > 0 || duration !== null}
        onChange={(e) => K(e.target.value)}
      />
      <label htmlFor="pilot-mode">Sposób wykonania</label>
      <select
        id="pilot-mode"
        value={mode}
        disabled={started !== null || duration !== null}
        onChange={(e) => M(e.target.value)}
      >
        <option value="panel">Z użyciem panelu</option>
        <option value="usual">Dotychczasowy sposób uczestnika</option>
      </select>
      <label htmlFor="pilot-task">Zadanie</label>
      <select
        id="pilot-task"
        value={task}
        disabled={started !== null || duration !== null}
        onChange={(e) => T(e.target.value)}
      >
        {tasks.map((t) => (
          <option key={t[0]} value={t[0]}>
            {t[1]}
          </option>
        ))}
      </select>
      <div className="info">
        {current[2]}{" "}
        {mode === "usual" &&
          "Uczestnik korzysta z dotychczasowych narzędzi (np. notatnik, zakładki, edytor). Zapisz tylko porównywalne zadania."}
      </div>
      <div className="button-row">
        <button
          className="primary"
          disabled={
            !consent ||
            !/^[A-Za-z0-9_-]{1,20}$/.test(code) ||
            started !== null ||
            duration !== null
          }
          onClick={() => {
            S(performance.now());
            E(0);
          }}
        >
          Rozpocznij pomiar
        </button>
        <button
          className="outline"
          disabled={started === null}
          onClick={() => {
            D(Math.round((performance.now() - started) / 1000));
            S(null);
          }}
        >
          Zatrzymaj pomiar
        </button>
        <span className="muted" role="timer">
          {duration ?? elapsed} s
        </span>
      </div>
      <p className="muted">
        Pomiar trwa także po przejściu do innego widoku panelu. Odświeżenie
        karty go przerwie.
      </p>
      {duration !== null && (
        <>
          <label htmlFor="pilot-outcome">Wynik obserwacji</label>
          <select
            id="pilot-outcome"
            value={outcome}
            onChange={(e) => O(e.target.value)}
          >
            <option value="completed">Ukończone</option>
            <option value="failed">Nieukończone</option>
            <option value="aborted">Przerwane przez uczestnika</option>
          </select>
          <label htmlFor="pilot-difficulty">Trudność według uczestnika</label>
          <select
            id="pilot-difficulty"
            value={difficulty}
            onChange={(e) => F(e.target.value)}
          >
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>
                {v} —{" "}
                {
                  [
                    "bardzo łatwe",
                    "łatwe",
                    "umiarkowane",
                    "trudne",
                    "bardzo trudne",
                  ][v - 1]
                }
              </option>
            ))}
          </select>
          <label className="consent">
            <input
              type="checkbox"
              checked={help}
              onChange={(e) => H(e.target.checked)}
            />
            Potrzebna była pomoc prowadzącego
          </label>
          <label htmlFor="pilot-note">
            Zaobserwowana trudność (bez danych osobowych)
          </label>
          <textarea
            id="pilot-note"
            maxLength={500}
            value={note}
            onChange={(e) => N(e.target.value)}
          />
          <button
            className="primary"
            onClick={() => {
              R([
                ...records,
                {
                  participant: code,
                  method: mode,
                  task,
                  seconds: duration,
                  outcome,
                  difficulty: Number(difficulty),
                  assisted: help,
                  note,
                },
              ]);
              D(null);
              E(0);
              N("");
              H(false);
            }}
          >
            Zapisz obserwację
          </button>
        </>
      )}
      <hr />
      <h3>Obserwacje w tej sesji: {records.length}</h3>
      <p>
        Wyniki nie są automatycznie oceniane jako sukces. Nieukończone zadania i
        pomoc prowadzącego pozostają w raporcie.
      </p>
      {records.map((r, i) => (
        <div className="contact-row" key={i}>
          <span>
            {tasks.find((t) => t[0] === r.task)?.[1]} · {r.seconds} s ·{" "}
            {r.outcome} · trudność {r.difficulty}/5
          </span>
        </div>
      ))}
      <div className="button-row">
        <button
          className="outline"
          disabled={!records.length}
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob(
                [
                  JSON.stringify(
                    { version: 1, participant: code, observations: records },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              ),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = `blisko-pilot-${code}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Eksportuj obserwacje
        </button>
        <button
          className="outline"
          onClick={() => {
            if (!window.confirm("Usunąć wszystkie pomiary z tej sesji?"))
              return;
            R([]);
            D(null);
            S(null);
            E(0);
            C(false);
            N("");
            H(false);
          }}
        >
          Wyczyść pomiary
        </button>
      </div>
    </section>
  );
}
