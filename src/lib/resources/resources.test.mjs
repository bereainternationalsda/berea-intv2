// Run with `npm test`. Covers the rules for resource files and links.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import * as f from "./files.ts";

const bytes = (...values) => Uint8Array.from(values);
const item = (over = {}) => ({ id: "a", title: "T", kind: "file", url: "https://x.test/a", createdAt: 1000, ...over });

describe("file checks", () => {
  test("accepts the allowed kinds, in any letter case", () => {
    for (const name of ["a.pdf", "A.PDF", "deck.pptx", "old.ppt", "notes.docx", "old.doc", "sheet.xlsx", "old.xls", "sermon.mp3"]) {
      assert.equal(f.checkFile(name, 1000), null, name);
    }
  });

  test("refuses programs, scripts, web pages and archives", () => {
    for (const name of ["setup.exe", "run.sh", "x.js", "page.html", "a.svg", "b.zip", "c.bat", "d.dmg", "e.php", "noextension", "trailingdot."]) {
      assert.match(f.checkFile(name, 1000) ?? "", /isn't allowed/, name);
    }
  });

  test("a double extension is judged by the last one", () => {
    assert.equal(f.checkFile("report.exe.pdf", 10), null);
    assert.match(f.checkFile("report.pdf.exe", 10) ?? "", /isn't allowed/);
  });

  test("size limits", () => {
    assert.match(f.checkFile("a.pdf", 0) ?? "", /empty/);
    assert.equal(f.checkFile("a.pdf", f.MAX_FILE_BYTES), null);
    assert.match(f.checkFile("a.pdf", f.MAX_FILE_BYTES + 1) ?? "", /limit is 50 MB/);
  });

  test("prototype names are not file types", () => {
    for (const name of ["a.constructor", "a.__proto__", "a.toString", "a.hasOwnProperty"]) {
      assert.equal(f.isAllowedExtension(f.fileExtension(name)), false, name);
    }
  });

  test("formatFileSize", () => {
    assert.equal(f.formatFileSize(500), "500 B");
    assert.equal(f.formatFileSize(2048), "2 KB");
    assert.equal(f.formatFileSize(2.4 * 1024 * 1024), "2.4 MB");
    assert.equal(f.formatFileSize(50 * 1024 * 1024), "50 MB");
    assert.equal(f.formatFileSize(150 * 1024 * 1024), "150 MB");
  });
});

describe("storage paths", () => {
  test("safeFileName strips paths, odd characters and accents but keeps the extension", () => {
    assert.equal(f.safeFileName("Sermon – Grace & Truth (final).PDF"), "Sermon-Grace-Truth-final.pdf");
    assert.equal(f.safeFileName("C:\\Users\\me\\deck.pptx"), "deck.pptx");
    assert.equal(f.safeFileName("../../etc/passwd.pdf"), "passwd.pdf");
    assert.equal(f.safeFileName("Café Résumé.docx"), "Cafe-Resume.docx");
    assert.equal(f.safeFileName("%2e%2e.pdf"), "2e-2e.pdf");
    assert.equal(f.safeFileName("日本語.pdf"), "file.pdf");
    assert.equal(f.safeFileName(".pdf"), "file.pdf");
    assert.ok(f.safeFileName(`${"a".repeat(300)}.pdf`).length <= 85);
  });

  test("a generated path is accepted for its own category only", () => {
    const path = f.newStoragePath("sermons", "My Talk.pdf", "0123456789ab");
    assert.equal(path, "resources/sermons/0123456789ab-My-Talk.pdf");
    assert.equal(f.isValidResourcePath(path, "sermons"), true);
    assert.equal(f.isValidResourcePath(path, "training"), false);
  });

  test("hand-made paths are refused", () => {
    const ok = "resources/sermons/0123456789ab-talk.pdf";
    assert.equal(f.isValidResourcePath(ok, "sermons"), true);
    for (const bad of [
      "images/sermons/0123456789ab-talk.pdf", // wrong folder
      "resources/sermons/../images/0123456789ab-talk.pdf", // traversal
      "resources/sermons/sub/0123456789ab-talk.pdf", // nested
      "resources/sermons/talk.pdf", // no upload id
      "resources/sermons/0123456789ab-talk.exe", // bad type
      "resources/sermons/0123456789ab-.pdf", // empty stem
      "resources/sermons/0123456789AB-talk.pdf", // id must be lower-case hex
      "resources/sermons/0123456789ab-ta lk.pdf", // space
      "resources/sermons/0123456789ab-talk.pdf/", // trailing slash
      "resources/sermons/0123456789ab-talk.pdf\n", // newline
      "resources/sermons/0123456789ab-talk.pdf?x=1", // query
      "resources/sermons/0123456789ab-tal%2fk.pdf", // encoded slash
      "/resources/sermons/0123456789ab-talk.pdf", // leading slash
      "",
    ]) {
      assert.equal(f.isValidResourcePath(bad, "sermons"), false, JSON.stringify(bad));
    }
  });
});

describe("file contents match the extension", () => {
  const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31);
  const ZIP = bytes(0x50, 0x4b, 0x03, 0x04, 0, 0);
  const OLE = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
  const ID3 = bytes(0x49, 0x44, 0x33, 4, 0);
  const FRAME = bytes(0xff, 0xfb, 0x90, 0x64);
  const EXE = bytes(0x4d, 0x5a, 0x90, 0); // "MZ"

  test("genuine files pass", () => {
    assert.equal(f.bytesMatchExtension("pdf", PDF), true);
    for (const ext of ["docx", "pptx", "xlsx"]) assert.equal(f.bytesMatchExtension(ext, ZIP), true, ext);
    for (const ext of ["doc", "ppt", "xls"]) assert.equal(f.bytesMatchExtension(ext, OLE), true, ext);
    assert.equal(f.bytesMatchExtension("mp3", ID3), true);
    assert.equal(f.bytesMatchExtension("mp3", FRAME), true);
  });

  test("a program renamed to .pdf (or anything) fails", () => {
    for (const ext of ["pdf", "docx", "pptx", "xlsx", "doc", "ppt", "xls", "mp3"]) {
      assert.equal(f.bytesMatchExtension(ext, EXE), false, ext);
    }
  });

  test("one type's bytes under another type's name fail", () => {
    assert.equal(f.bytesMatchExtension("pdf", ZIP), false);
    assert.equal(f.bytesMatchExtension("docx", PDF), false);
    assert.equal(f.bytesMatchExtension("doc", ZIP), false);
  });

  test("short, empty and unknown inputs fail safely", () => {
    assert.equal(f.bytesMatchExtension("pdf", bytes()), false);
    assert.equal(f.bytesMatchExtension("pdf", bytes(0x25, 0x50)), false);
    assert.equal(f.bytesMatchExtension("mp3", bytes(0xff)), false);
    assert.equal(f.bytesMatchExtension("exe", PDF), false);
    assert.equal(f.bytesMatchExtension("constructor", PDF), false);
  });
});

describe("links", () => {
  test("accepts ordinary web addresses and tidies them", () => {
    assert.equal(f.normaliseLinkUrl("https://www.youtube.com/watch?v=abc"), "https://www.youtube.com/watch?v=abc");
    assert.equal(f.normaliseLinkUrl("  http://example.org  "), "http://example.org/");
    assert.equal(f.normaliseLinkUrl("https://drive.google.com/file/d/1/view?usp=sharing"), "https://drive.google.com/file/d/1/view?usp=sharing");
  });

  test("refuses anything that isn't a plain http(s) address", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "ftp://example.com/x",
      "vbscript:x",
      "//example.com",
      "example.com", // no scheme
      "https://",
      "https://localhost", // no dot: not a real public address
      "https://exa mple.com",
      "https://example.com/a b",
      "",
      "   ",
      `https://example.com/${"a".repeat(500)}`,
    ]) {
      assert.equal(f.normaliseLinkUrl(bad), null, JSON.stringify(bad));
    }
  });
});

describe("ordering", () => {
  test("pinned items first by position, the rest newest first", () => {
    const sorted = f.sortResources([
      item({ id: "old", createdAt: 1 }),
      item({ id: "second", order: 2, createdAt: 5 }),
      item({ id: "new", createdAt: 9 }),
      item({ id: "first", order: 1, createdAt: 3 }),
      item({ id: "mid", createdAt: 5 }),
    ]);
    assert.deepEqual(sorted.map((i) => i.id), ["first", "second", "new", "mid", "old"]);
  });

  test("equal positions fall back to newest first, and the input isn't changed", () => {
    const input = [item({ id: "a", order: 1, createdAt: 1 }), item({ id: "b", order: 1, createdAt: 2 })];
    assert.deepEqual(f.sortResources(input).map((i) => i.id), ["b", "a"]);
    assert.deepEqual(input.map((i) => i.id), ["a", "b"]);
  });

  test("a position of 0 counts as pinned", () => {
    const sorted = f.sortResources([item({ id: "x", createdAt: 9 }), item({ id: "zero", order: 0, createdAt: 1 })]);
    assert.equal(sorted[0].id, "zero");
  });
});

describe("labels", () => {
  test("meta and badge", () => {
    const pdf = item({ fileType: "pdf", fileSize: 2.4 * 1024 * 1024 });
    assert.equal(f.resourceMeta(pdf), "PDF · 2.4 MB");
    assert.equal(f.resourceBadge(pdf), "PDF");
    assert.equal(f.resourceBadge(item({ fileType: "pptx" })), "PPT");
    assert.equal(f.resourceBadge(item({ fileType: "docx" })), "DOC");
    assert.equal(f.resourceBadge(item({ fileType: "xlsx" })), "XLS");
    assert.equal(f.resourceMeta(item({ kind: "link" })), "Link");
    assert.equal(f.resourceBadge(item({ kind: "link" })), "LINK");
    assert.equal(f.resourceMeta(item({ fileType: "mp3" })), "Audio");
  });

  test("displayFileName removes paths and control characters", () => {
    assert.equal(f.displayFileName("C:\\x\\Talk 1.pdf"), "Talk 1.pdf");
    assert.equal(f.displayFileName("a\u0000b\nc.pdf"), "abc.pdf");
  });
});
