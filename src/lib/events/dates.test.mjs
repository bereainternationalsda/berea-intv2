// Run with `npm test`. Uses Node's built-in test runner, so there's nothing to install.
// (Node strips the TypeScript types from dates.ts on the fly.)
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import * as d from "./dates.ts";

describe("todayInSA: 'today' is a South African date wherever the server runs", () => {
  test("23:59:59 SAST is still the same day", () => {
    assert.equal(d.todayInSA(new Date("2026-10-27T21:59:59Z")), "2026-10-27");
  });
  test("midnight SAST starts the next day", () => {
    assert.equal(d.todayInSA(new Date("2026-10-27T22:00:00Z")), "2026-10-28");
  });
  test("the new year arrives in SA first", () => {
    assert.equal(d.todayInSA(new Date("2026-12-31T22:30:00Z")), "2027-01-01");
  });
});

describe("validation", () => {
  const cases = (fn, rows) => rows.forEach(([input, expected]) =>
    test(`${fn.name}(${JSON.stringify(input)}) is ${expected}`, () => assert.equal(fn(input), expected)));

  cases(d.isValidDateString, [
    ["2026-02-28", true], ["2024-02-29", true], ["2025-02-29", false], ["2026-02-31", false],
    ["2026-13-01", false], ["26-1-1", false], ["1999-01-01", false], ["2026-1-01", false], ["", false],
  ]);
  cases(d.isValidTimeString, [
    ["09:00", true], ["23:59", true], ["00:00", true], ["24:00", false], ["9:00", false], ["09:60", false], ["", false],
  ]);
  cases(d.isValidPhone, [
    ["+27 82 123 4567", true], ["082-123-4567", true], ["(011) 555 1234", true], ["0821234567", true],
    ["12345", false], ["abc", false], ["call me", false], ["+++-----", false],
  ]);
});

describe("visibility rules (today = 10 March 2026)", () => {
  const TODAY = "2026-03-10";
  const event = (overrides) => ({ published: true, startDate: "2026-03-20", ...overrides });
  const outcome = (e) => ({
    pageOpens: d.isPageAvailable(e, TODAY),
    listed: d.isListed(e, TODAY),
    status: d.getEventStatus(e, TODAY),
    ended: d.hasEnded(e, TODAY),
    happeningNow: d.isHappeningNow(e, TODAY),
  });

  const rows = [
    ["a draft",                         { published: false },                                  { pageOpens: false, listed: false, status: "draft",     ended: false, happeningNow: false }],
    ["a future event, no windows",      {},                                                    { pageOpens: true,  listed: true,  status: "live",      ended: false, happeningNow: false }],
    ["a one-day event today",           { startDate: TODAY },                                  { pageOpens: true,  listed: true,  status: "live",      ended: false, happeningNow: true  }],
    ["a one-day event yesterday",       { startDate: "2026-03-09" },                           { pageOpens: true,  listed: false, status: "ended",     ended: true,  happeningNow: false }],
    ["a camp in progress",              { startDate: "2026-03-08", endDate: "2026-03-12" },    { pageOpens: true,  listed: true,  status: "live",      ended: false, happeningNow: true  }],
    ["a camp ending today",             { startDate: "2026-03-08", endDate: TODAY },           { pageOpens: true,  listed: true,  status: "live",      ended: false, happeningNow: true  }],
    ["a camp that ended yesterday",     { startDate: "2026-03-06", endDate: "2026-03-09" },    { pageOpens: true,  listed: false, status: "ended",     ended: true,  happeningNow: false }],
    ["scheduled to show tomorrow",      { showFrom: "2026-03-11" },                            { pageOpens: false, listed: false, status: "scheduled", ended: false, happeningNow: false }],
    ["scheduled to show today",         { showFrom: TODAY },                                   { pageOpens: true,  listed: true,  status: "live",      ended: false, happeningNow: false }],
    ["promotion stopped early",         { showUntil: "2026-03-09" },                           { pageOpens: true,  listed: false, status: "ended",     ended: false, happeningNow: false }],
    ["promotion ending today",          { showUntil: TODAY },                                  { pageOpens: true,  listed: true,  status: "live",      ended: false, happeningNow: false }],
    ["promotion outlasting the event",  { startDate: "2026-03-05", showUntil: "2026-03-15" },  { pageOpens: true,  listed: true,  status: "live",      ended: true,  happeningNow: false }],
  ];
  for (const [label, overrides, expected] of rows) {
    test(label, () => assert.deepEqual(outcome(event(overrides)), expected));
  }
});

describe("previousDay", () => {
  test("crosses month and year boundaries, and leap days", () => {
    assert.equal(d.previousDay("2026-03-01"), "2026-02-28");
    assert.equal(d.previousDay("2024-03-01"), "2024-02-29");
    assert.equal(d.previousDay("2026-01-01"), "2025-12-31");
    assert.equal(d.previousDay("2026-03-15"), "2026-03-14");
  });
});

describe("isRegistrationOpen (today = 10 March 2026)", () => {
  const TODAY = "2026-03-10";
  const reg = (overrides) => ({ published: true, registrationEnabled: true, startDate: "2026-03-20", ...overrides });
  const open = (overrides) => d.isRegistrationOpen(reg(overrides), TODAY);

  const rows = [
    ["registration switched off",                    { registrationEnabled: false },                         false],
    ["registration never configured",                { registrationEnabled: undefined },                     false],
    ["a draft, even with registration on",           { published: false },                                   false],
    ["not yet promoted (show-from is tomorrow)",     { showFrom: "2026-03-11" },                             false],
    ["a future event, no deadline",                  {},                                                     true ],
    ["no deadline, event starts tomorrow",           { startDate: "2026-03-11" },                            true ],
    ["no deadline, event starts today: closed",      { startDate: TODAY },                                   false],
    ["no deadline, event began yesterday",           { startDate: "2026-03-09", endDate: "2026-03-12" },     false],
    ["deadline is today: still open",                { registrationDeadline: TODAY },                        true ],
    ["deadline was yesterday: closed",               { registrationDeadline: "2026-03-09" },                 false],
    ["deadline is tomorrow",                         { registrationDeadline: "2026-03-11" },                 true ],
    ["same-day training, deadline = start day",      { startDate: TODAY, registrationDeadline: TODAY },      true ],
    ["camp under way, deadline still ahead",         { startDate: "2026-03-08", endDate: "2026-03-12", registrationDeadline: "2026-03-11" }, true],
    ["event over, even though the deadline is ahead",{ startDate: "2026-03-01", endDate: "2026-03-05", registrationDeadline: "2026-03-30" }, false],
  ];
  for (const [label, overrides, expected] of rows) {
    test(label, () => assert.equal(open(overrides), expected));
  }
});

test("events sort by start date, then title", () => {
  const sorted = [
    { startDate: "2026-04-01", title: "B" },
    { startDate: "2026-03-01", title: "Z" },
    { startDate: "2026-04-01", title: "A" },
  ].sort(d.byStartDate).map((e) => e.title);
  assert.deepEqual(sorted, ["Z", "A", "B"]);
});

describe("date wording", () => {
  test("a single day", () => assert.equal(d.formatEventDates("2026-02-14"), "Saturday 14 February 2026"));
  test("a range in one month", () => assert.equal(d.formatEventDates("2026-02-14", "2026-02-16"), "Sat 14 Feb – Mon 16 Feb 2026"));
  test("a range across months", () => assert.equal(d.formatEventDates("2026-02-27", "2026-03-02"), "Fri 27 Feb – Mon 2 Mar 2026"));
  test("a range across years", () => assert.equal(d.formatEventDates("2026-12-30", "2027-01-02"), "Wed 30 Dec 2026 – Sat 2 Jan 2027"));
  test("an end date equal to the start is one day", () =>
    assert.equal(d.formatEventDates("2026-02-14", "2026-02-14"), d.formatEventDates("2026-02-14")));
  test("times", () => {
    assert.equal(d.formatEventTimes("09:00", "13:00"), "09:00 – 13:00");
    assert.equal(d.formatEventTimes("09:00"), "From 09:00");
    assert.equal(d.formatEventTimes(), "");
  });
});
