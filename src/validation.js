const object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const text = (x) => typeof x === "string";
const amount = (x) =>
  (text(x) || typeof x === "number") &&
  (x === "" || (Number.isFinite(Number(x)) && Number(x) >= 0));
export function validateWorkspace(d) {
  const valid =
    object(d) &&
    object(d.profile) &&
    text(d.profile.title) &&
    amount(d.profile.goal) &&
    amount(d.profile.raised) &&
    ["facts", "draft", "topic"].every((k) => text(d[k])) &&
    Array.isArray(d.tasks) &&
    d.tasks.every(
      (t) =>
        object(t) &&
        text(t.title) &&
        text(t.detail) &&
        typeof t.done === "boolean",
    ) &&
    Array.isArray(d.contacts) &&
    d.contacts.every((c) => object(c) && text(c.name) && text(c.email)) &&
    object(d.saved) &&
    Object.entries(d.saved).every(([id, v]) => {
      if (
        !object(v) ||
        !text(v.status) ||
        !text(v.note) ||
        ["__proto__", "constructor", "prototype"].includes(id)
      )
        return false;
      if (!v.source)
        return [
          "dzieciom",
          "siepomaga",
          "eurordis",
          "orphanet",
          "trials",
        ].includes(id);
      const s = v.source;
      return (
        object(s) &&
        /^NCT\d{8}$/.test(id) &&
        s.id === id &&
        s.url === `https://clinicaltrials.gov/study/${id}` &&
        ["name", "description", "next", "area", "scope"].every((k) =>
          text(s[k]),
        )
      );
    });
  if (!valid)
    throw new Error(
      "Nieprawidłowy format zapisanych danych. Bieżąca praca nie została zmieniona.",
    );
  return d;
}
export function mapStudies(data, retrieved) {
  if (!Array.isArray(data?.studies))
    throw new Error("Nieprawidłowa odpowiedź rejestru.");
  const seen = new Set();
  return data.studies.flatMap((x) => {
    const p = x?.protocolSection,
      id = p?.identificationModule?.nctId;
    if (
      !/^NCT\d{8}$/.test(id) ||
      seen.has(id) ||
      !text(p.identificationModule.briefTitle)
    )
      return [];
    seen.add(id);
    return [
      {
        id,
        name: p.identificationModule.briefTitle,
        area: "Poszukiwanie leczenia",
        scope: "Świat",
        url: `https://clinicaltrials.gov/study/${id}`,
        description:
          "Badanie kliniczne · " +
          (text(p.statusModule?.overallStatus)
            ? p.statusModule.overallStatus
            : "Brak statusu"),
        next: "Omów kryteria udziału z lekarzem prowadzącym.",
        updated: text(p.statusModule?.lastUpdatePostDateStruct?.date)
          ? p.statusModule.lastUpdatePostDateStruct.date
          : null,
        retrieved,
        locations: (Array.isArray(p.contactsLocationsModule?.locations)
          ? p.contactsLocationsModule.locations
          : []
        )
          .slice(0, 3)
          .map((l) =>
            [l?.facility, l?.city, l?.country].filter(text).join(", "),
          ),
      },
    ];
  });
}
