import { test } from "node:test";
import assert from "node:assert/strict";
import { validateWorkspace, mapStudies } from "../src/validation.js";
const empty = () => ({
  profile: { title: "", goal: "", raised: "" },
  tasks: [],
  contacts: [],
  facts: "",
  draft: "",
  topic: "",
  saved: {},
});
test("invalid nested data is rejected before rendering", () => {
  for (const patch of [
    { tasks: [null] },
    { contacts: [{}] },
    { facts: null },
    { profile: { title: "", goal: -1, raised: 0 } },
    { saved: { bad: null } },
  ])
    assert.throws(() => validateWorkspace({ ...empty(), ...patch }), /format/);
  assert.deepEqual(validateWorkspace(empty()), empty());
});
test("saved links cannot contain arbitrary schemes or destinations", () => {
  const d = empty();
  d.saved.NCT12345678 = {
    status: "",
    note: "",
    source: {
      id: "NCT12345678",
      name: "test",
      area: "",
      scope: "",
      description: "",
      next: "",
      url: "javascript:alert(1)",
    },
  };
  assert.throws(() => validateWorkspace(d), /format/);
  d.saved.NCT12345678.source.url =
    "https://clinicaltrials.gov/study/NCT12345678";
  assert.equal(validateWorkspace(d), d);
});
test("registry tolerates missing locations and skips malformed or duplicate studies", () => {
  const item = {
    protocolSection: {
      identificationModule: { nctId: "NCT12345678", briefTitle: "Study" },
      contactsLocationsModule: { locations: {} },
    },
  };
  const studies = mapStudies(
    { studies: [null, {}, item, item] },
    "2026-11-11T00:00:00Z",
  );
  assert.equal(studies.length, 1);
  assert.deepEqual(studies[0].locations, []);
  assert.equal(studies[0].name, "Study");
  assert.throws(() => mapStudies({ studies: {} }, ""), /odpowiedź/);
});
