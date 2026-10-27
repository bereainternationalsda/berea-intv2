// Run with `npm test`. Covers the registration rules, the Excel import, the
// planning stats and the Excel export (including a real write-then-read of .xlsx files).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readSheet } from "read-excel-file/node";
import writeExcelFile from "write-excel-file/node";
import { attendeesFromRows } from "./attendee-import.ts";
import * as r from "./registration.ts";
import { buildRegistrationExport, buildTemplateSheets } from "./workbooks.ts";

// ---- helpers ---------------------------------------------------------------

const adult = (name = "Thandi Dlamini", extra = {}) => ({ name, category: "adult", age: "", ageRange: "", dietary: "", ...extra });
const child = (name = "Sipho Dlamini", age = "9", extra = {}) => ({ name, category: "child", age, ageRange: "", dietary: "", ...extra });

const validInput = (overrides = {}) => ({
  type: "individual",
  contactName: "Thandi Dlamini",
  contactPhone: "082 123 4567",
  contactEmail: "Thandi@Example.com",
  emergencyName: "",
  emergencyPhone: "",
  attendees: [adult()],
  consent: true,
  ...overrides,
});

const errorsOf = (input, options) => {
  const result = r.validateRegistration(input, options);
  return result.ok ? {} : result.errors;
};

// ---- validation: the happy paths -------------------------------------------

describe("validateRegistration: accepts good registrations", () => {
  test("an individual adult", () => {
    const result = r.validateRegistration(validInput());
    assert.equal(result.ok, true);
    assert.equal(result.value.contactEmail, "thandi@example.com", "email is lower-cased");
    assert.deepEqual(result.value.attendees, [{ name: "Thandi Dlamini", category: "adult" }]);
    assert.equal("emergencyName" in result.value, false, "no emergency contact stored when none is needed");
  });

  test("a family with a child (emergency contact given)", () => {
    const result = r.validateRegistration(validInput({
      type: "family",
      attendees: [adult(), child("Sipho", "9", { dietary: "Vegetarian" })],
      emergencyName: "Gogo Dlamini",
      emergencyPhone: "011 555 1234",
    }));
    assert.equal(result.ok, true);
    assert.deepEqual(result.value.attendees[1], { name: "Sipho", category: "child", age: 9, dietary: "Vegetarian" });
    assert.equal(result.value.emergencyName, "Gogo Dlamini");
  });

  test("a group needs a name and keeps it", () => {
    const result = r.validateRegistration(validInput({
      type: "group", groupName: "  Berea   Pathfinder Club ",
      attendees: [adult("Leader One"), adult("Leader Two")],
    }));
    assert.equal(result.ok, true);
    assert.equal(result.value.groupName, "Berea Pathfinder Club", "extra spaces collapsed");
  });

  test("adult age ranges: blank, canonical and sloppy forms are all fine", () => {
    for (const range of ["", "18-25", "66+", "26 - 35", "36–45", "46 to 55"]) {
      const result = r.validateRegistration(validInput({ attendees: [adult("A", { ageRange: range })] }));
      assert.equal(result.ok, true, `range "${range}"`);
    }
  });
});

// ---- validation: what must be refused --------------------------------------

describe("validateRegistration: refuses bad input", () => {
  test("nothing at all", () => {
    for (const junk of [undefined, null, "hello", 42, [], {}]) {
      assert.equal(r.validateRegistration(junk).ok, false);
    }
  });

  test("consent must be exactly true", () => {
    for (const consent of [false, undefined, "true", 1, "on"]) {
      assert.ok(errorsOf(validInput({ consent })).consent, `consent = ${JSON.stringify(consent)}`);
    }
  });

  test("an unknown type, or one the event doesn't take", () => {
    assert.ok(errorsOf(validInput({ type: "vip" })).type);
    assert.match(errorsOf(validInput({ type: "group", groupName: "G", attendees: [adult("A"), adult("B")] }), { allowedTypes: ["individual"] }).type, /doesn't take group/);
  });

  test("contact details", () => {
    const e = errorsOf(validInput({ contactName: "", contactPhone: "12", contactEmail: "not-an-email" }));
    assert.ok(e.contactName && e.contactPhone && e.contactEmail);
    assert.ok(errorsOf(validInput({ contactEmail: "a@b" })).contactEmail, "needs a dot in the domain");
    assert.ok(errorsOf(validInput({ contactName: "x".repeat(81) })).contactName);
  });

  test("a group must be named", () => {
    assert.ok(errorsOf(validInput({ type: "group", groupName: "", attendees: [adult("A"), adult("B")] })).groupName);
  });

  test("head-count limits per type", () => {
    assert.ok(errorsOf(validInput({ attendees: [adult("A"), adult("B")] })).attendees, "individual: 2 people");
    assert.ok(errorsOf(validInput({ attendees: [] })).attendees, "individual: nobody");
    assert.ok(errorsOf(validInput({ type: "family", attendees: [adult()] })).attendees, "family: 1 person");
    assert.ok(errorsOf(validInput({ type: "family", attendees: Array.from({ length: 21 }, (_, i) => adult(`P${i}`)) })).attendees, "family: 21");
    assert.equal(errorsOf(validInput({ type: "family", attendees: Array.from({ length: 20 }, (_, i) => adult(`P${i}`)) })).attendees, undefined, "family: 20 is allowed");
    const big = (n) => validInput({ type: "group", groupName: "G", attendees: Array.from({ length: n }, (_, i) => adult(`P${i}`)) });
    assert.equal(errorsOf(big(200)).attendees, undefined, "group: 200 is allowed");
    assert.ok(errorsOf(big(201)).attendees, "group: 201");
  });

  test("children need an exact age from 0 to 17", () => {
    const ageError = (age) => errorsOf(validInput({ attendees: [child("K", age)], emergencyName: "E", emergencyPhone: "082 123 4567" }))["attendees.0.age"];
    for (const ok of ["0", "9", "17", 12]) assert.equal(ageError(ok), undefined, `age ${ok}`);
    for (const bad of ["", "18", "-1", "3.5", "ten", "999", null]) assert.ok(ageError(bad), `age ${JSON.stringify(bad)}`);
  });

  test("an adult range must come from the list", () => {
    assert.ok(errorsOf(validInput({ attendees: [adult("A", { ageRange: "30-40" })] }))["attendees.0.ageRange"]);
  });

  test("each person needs a name and an adult/child choice", () => {
    const e = errorsOf(validInput({ type: "family", attendees: [{ ...adult(), name: "" }, { ...adult("B"), category: "" }] }));
    assert.ok(e["attendees.0.name"]);
    assert.ok(e["attendees.1.category"]);
  });

  test("dietary notes are length-limited", () => {
    assert.ok(errorsOf(validInput({ attendees: [adult("A", { dietary: "x".repeat(201) })] }))["attendees.0.dietary"]);
  });

  test("an emergency contact is required when any child is coming", () => {
    const e = errorsOf(validInput({ type: "family", attendees: [adult(), child()] }));
    assert.ok(e.emergencyName && e.emergencyPhone);
  });

  test("...but optional (yet must be complete if started) for adults only", () => {
    assert.equal(r.validateRegistration(validInput()).ok, true);
    const half = errorsOf(validInput({ emergencyName: "Someone", emergencyPhone: "" }));
    assert.ok(half.emergencyPhone, "a name without a number is refused");
    assert.ok(errorsOf(validInput({ emergencyName: "S", emergencyPhone: "abc" })).emergencyPhone);
  });

  test("hostile and messy text is neutralised, not trusted", () => {
    const result = r.validateRegistration(validInput({
      contactName: "  Thandi\u0000\u0007   \n Dlamini ",
      attendees: [adult("=HYPERLINK(\"http://evil\")\t")],
    }));
    assert.equal(result.ok, true);
    assert.equal(result.value.contactName, "Thandi Dlamini", "control characters and extra spaces removed");
    assert.equal(result.value.attendees[0].name, "=HYPERLINK(\"http://evil\")", "kept as plain text (exports store it as text)");
  });

  test("only the first 200 rows are inspected (no work amplification)", () => {
    const rows = Array.from({ length: 50_000 }, (_, i) => adult(`P${i}`));
    const started = Date.now();
    const result = r.validateRegistration(validInput({ type: "group", groupName: "G", attendees: rows }));
    assert.equal(result.ok, false);
    assert.ok(Date.now() - started < 500, "returns quickly");
  });
});

// ---- age helpers -----------------------------------------------------------

describe("age helpers", () => {
  test("normaliseAgeRange", () => {
    assert.equal(r.normaliseAgeRange("18 - 25"), "18-25");
    assert.equal(r.normaliseAgeRange("66 +"), "66+");
    assert.equal(r.normaliseAgeRange("over 66"), "66+");
    assert.equal(r.normaliseAgeRange("30-40"), null);
    assert.equal(r.normaliseAgeRange(""), null);
    assert.equal(r.normaliseAgeRange(undefined), null);
  });
  test("ageRangeForAge puts an exact age in its range", () => {
    assert.deepEqual([17, 18, 25, 26, 35, 36, 65, 66, 90].map(r.ageRangeForAge), [null, "18-25", "18-25", "26-35", "26-35", "36-45", "56-65", "66+", "66+"]);
  });
});

// ---- Excel import ----------------------------------------------------------

describe("attendeesFromRows (Excel import)", () => {
  const header = ["Full name", "Adult or child", "Age (children only)", "Age range (adults, optional)", "Dietary needs or allergies"];

  test("reads the template layout", () => {
    const { attendees, problems } = attendeesFromRows([
      header,
      ["Thandi", "Adult", null, "26-35", "Vegetarian"],
      ["Sipho", "Child", 9, null, null],
    ]);
    assert.deepEqual(problems, []);
    assert.deepEqual(attendees, [
      { name: "Thandi", category: "adult", age: "", ageRange: "26-35", dietary: "Vegetarian" },
      { name: "Sipho", category: "child", age: "9", ageRange: "", dietary: "" },
    ]);
  });

  test("copes with reordered columns, a title row and different capitalisation", () => {
    const { attendees } = attendeesFromRows([
      ["Youth camp list"], [],
      ["ALLERGIES", "name", "ADULT/CHILD", "age"],
      ["Peanuts", "Lerato", "child", 12],
    ]);
    assert.deepEqual(attendees, [{ name: "Lerato", category: "child", age: "12", ageRange: "", dietary: "Peanuts" }]);
  });

  test("works out adult/child from the age when that column is empty", () => {
    const { attendees } = attendeesFromRows([header, ["A", null, 7], ["B", null, 40]]);
    assert.deepEqual(attendees.map((a) => a.category), ["child", "adult"]);
  });

  test("turns an adult's exact age into a range", () => {
    const { attendees } = attendeesFromRows([header, ["Mr Khumalo", "Adult", 52]]);
    assert.equal(attendees[0].ageRange, "46-55");
    assert.equal(attendees[0].age, "");
  });

  test("skips blank rows, keeps going past problems, and says what's wrong", () => {
    const { attendees, problems } = attendeesFromRows([
      header,
      ["Good Person", "Adult"],
      [null, null, null, null, null],
      ["Odd One", "Martian", null],
      ["Bad Range", "Adult", null, "30-40"],
      ["Child No Age", "Child", "ten"],
    ]);
    assert.equal(attendees.length, 4, "the blank row is skipped, the rest are kept");
    assert.equal(problems.length, 3);
    assert.match(problems.join("\n"), /Row 4.*Martian/);
    assert.match(problems.join("\n"), /Row 5.*30-40/);
    assert.match(problems.join("\n"), /Row 6.*ten/);
    assert.equal(attendees[1].category, "", "an unrecognised category is left for the person to choose");
  });

  test("a rows with no name still comes through (so the form can highlight it)", () => {
    const { attendees } = attendeesFromRows([header, [null, "Adult"]]);
    assert.deepEqual(attendees.map((a) => a.name), [""]);
  });

  test("refuses a sheet with no name column, without throwing", () => {
    const { attendees, problems } = attendeesFromRows([["Surname", "Colour"], ["x", "y"]]);
    assert.equal(attendees.length, 0);
    assert.match(problems[0], /Full name/);
    assert.equal(attendeesFromRows([]).attendees.length, 0);
  });

  test("an empty template says so", () => {
    assert.match(attendeesFromRows([header]).problems[0], /no people/);
  });

  test("ignores rows beyond the limit", () => {
    const rows = [header, ...Array.from({ length: 250 }, (_, i) => [`P${i}`, "Adult"])];
    const result = attendeesFromRows(rows);
    assert.equal(result.attendees.length, 200);
    assert.equal(result.truncated, true);
  });

  test("never trusts cell types: dates, booleans and objects are just empty", () => {
    const { attendees } = attendeesFromRows([header, ["Name", new Date(), true, {}, []]]);
    assert.equal(attendees.length, 1);
    assert.equal(attendees[0].category, "");
  });
});

// ---- planning stats --------------------------------------------------------

const stored = (id, type, attendees, paid = false, createdAt = "2026-10-01T08:00:00Z") =>
  ({ id, type, contactName: "C", contactPhone: "0821234567", contactEmail: "c@x.com", attendees, paid, createdAt });

describe("summarise", () => {
  const registrations = [
    stored("BRN-AAAAAA", "family", [{ name: "P", category: "adult", ageRange: "36-45" }, { name: "K1", category: "child", age: 9, dietary: "Vegan" }, { name: "K2", category: "child", age: 9 }], true),
    stored("BRN-BBBBBB", "individual", [{ name: "Q", category: "adult" }]),
    stored("BRN-CCCCCC", "group", [{ name: "G1", category: "child", age: 14 }, { name: "G2", category: "adult", ageRange: "18-25", dietary: "Halaal" }]),
  ];
  const s = r.summarise(registrations);

  test("totals", () => {
    assert.deepEqual([s.registrations, s.people, s.adults, s.children], [3, 6, 3, 3]);
    assert.deepEqual([s.paid, s.unpaid, s.withDietaryNeeds], [1, 2, 2]);
    assert.deepEqual(s.byType, { individual: 1, family: 1, group: 1 });
  });
  test("children by exact age, youngest first", () => {
    assert.deepEqual(s.childrenByAge, [{ age: 9, count: 2 }, { age: 14, count: 1 }]);
  });
  test("adults by range, in order, with 'Not given' last", () => {
    assert.deepEqual(s.adultsByRange, [{ range: "18-25", count: 1 }, { range: "36-45", count: 1 }, { range: "Not given", count: 1 }]);
  });
  test("an empty event", () => {
    assert.deepEqual([r.summarise([]).people, r.summarise([]).childrenByAge], [0, []]);
  });
});

// ---- Excel files: written, then read back ----------------------------------

describe("Excel files (real .xlsx round trips)", () => {
  const event = { title: "Youth Camp", startDate: "2026-11-26", endDate: "2026-11-28" };
  const evil = [
    stored("BRN-EVIL01", "family",
      [{ name: "=1+1", category: "adult", ageRange: "26-35", dietary: "+SUM(A1:A9)" }, { name: "@cmd", category: "child", age: 8 }], false, "2026-10-27T12:30:00Z"),
  ];
  evil[0].contactName = "=HYPERLINK(\"http://evil.example\")";
  evil[0].contactPhone = "+27 82 123 4567";
  evil[0].emergencyName = "-2+3";
  evil[0].emergencyPhone = "0011 555 1234";

  async function roundTrip(sheets) {
    const buffer = await writeExcelFile(sheets).toBuffer();
    return Promise.all(sheets.map(async (sheet) => [sheet.sheet, await readSheet(buffer, sheet.sheet)]));
  }

  test("the export has three sheets with the right shape", async () => {
    const sheets = buildRegistrationExport(event, evil, "2026-10-27 15:00");
    const book = Object.fromEntries(await roundTrip(sheets));
    assert.deepEqual(Object.keys(book), ["Summary", "People", "Registrations"]);
    assert.equal(book.People.length, 1 + 2, "a header row plus one row per person");
    assert.equal(book.Registrations.length, 1 + 1, "a header row plus one row per registration");
    assert.equal(book.People[0][0], "Reference");
  });

  test("spreadsheet-formula text is kept as inert text, and phone numbers survive", async () => {
    const book = Object.fromEntries(await roundTrip(buildRegistrationExport(event, evil, "now")));
    const [, , , , contactName, contactPhone, , emergencyName, emergencyPhone, person1, , , , dietary] = book.People[1];
    assert.equal(person1, "=1+1", "a name starting with = is text, not a formula");
    assert.equal(dietary, "+SUM(A1:A9)");
    assert.equal(contactName, "=HYPERLINK(\"http://evil.example\")");
    assert.equal(emergencyName, "-2+3");
    assert.equal(contactPhone, "+27 82 123 4567", "leading + kept");
    assert.equal(emergencyPhone, "0011 555 1234", "leading zeros kept");
    assert.equal(book.People[2][11], 8, "a child's age is a real number, so it sorts and filters");
  });

  test("the summary sheet carries the planning numbers", async () => {
    const [[, summary]] = await roundTrip(buildRegistrationExport(event, evil, "now"));
    const flat = summary.flat().filter((cell) => cell !== null);
    assert.ok(flat.includes("People coming"));
    assert.ok(flat.includes("Age 8"), "children are broken down by age");
    assert.ok(flat.includes("26-35"), "adults are broken down by range");
  });

  test("an event with no registrations still exports cleanly", async () => {
    const book = Object.fromEntries(await roundTrip(buildRegistrationExport(event, [], "now")));
    assert.equal(book.People.length, 1);
    assert.equal(book.Registrations.length, 1);
  });

  test("the downloadable template round-trips through the importer", async () => {
    const sheets = buildTemplateSheets();
    assert.equal(sheets[0].sheet, "Attendees", "the importer reads the first sheet");
    const book = Object.fromEntries(await roundTrip(sheets));
    assert.match(attendeesFromRows(book.Attendees).problems[0], /no people/, "an untouched template imports as 'empty', not as an error");

    // ...and a filled-in copy imports correctly
    const filled = [{ ...sheets[0], data: [...sheets[0].data, [
      { type: String, value: "Zanele" }, { type: String, value: "Child" }, { type: Number, value: 11 }, null, { type: String, value: "No dairy" },
    ]] }];
    const [[, rows]] = await roundTrip(filled);
    assert.deepEqual(attendeesFromRows(rows).attendees, [{ name: "Zanele", category: "child", age: "11", ageRange: "", dietary: "No dairy" }]);
  });
});
