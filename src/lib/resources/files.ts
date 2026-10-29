// Rules for resource files and links. Pure (no Firebase, no React), so the admin
// form, the server and the tests all use the same code. Safe on server and client.

/** Keep in step with the size limit in storage.rules. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export type FileKind = "pdf" | "powerpoint" | "word" | "excel" | "audio";

type FileTypeInfo = {
  kind: FileKind;
  mime: string;
  /** PDFs open in the browser; everything else downloads. */
  inline: boolean;
};

export const FILE_TYPES: Record<string, FileTypeInfo> = {
  pdf: { kind: "pdf", mime: "application/pdf", inline: true },
  ppt: { kind: "powerpoint", mime: "application/vnd.ms-powerpoint", inline: false },
  pptx: {
    kind: "powerpoint",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    inline: false,
  },
  doc: { kind: "word", mime: "application/msword", inline: false },
  docx: {
    kind: "word",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    inline: false,
  },
  xls: { kind: "excel", mime: "application/vnd.ms-excel", inline: false },
  xlsx: {
    kind: "excel",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    inline: false,
  },
  mp3: { kind: "audio", mime: "audio/mpeg", inline: false },
};

export const ALLOWED_EXTENSIONS = Object.keys(FILE_TYPES);

/** For the file picker's `accept` attribute. */
export const FILE_ACCEPT = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export const FILE_KIND_LABEL: Record<FileKind, string> = {
  pdf: "PDF",
  powerpoint: "PowerPoint",
  word: "Word",
  excel: "Excel",
  audio: "Audio",
};

export const ALLOWED_TYPES_TEXT = "PDF, PowerPoint, Word, Excel or MP3";

export function fileExtension(name: string): string {
  const match = /\.([A-Za-z0-9]+)$/.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
}

export function isAllowedExtension(ext: string): boolean {
  return Object.hasOwn(FILE_TYPES, ext);
}

/** Why a file can't be used, or null if it's fine. Used before uploading. */
export function checkFile(name: string, size: number): string | null {
  const ext = fileExtension(name);
  if (!isAllowedExtension(ext)) {
    return `That kind of file isn't allowed. Use a ${ALLOWED_TYPES_TEXT} file.`;
  }
  if (size <= 0) return "That file is empty.";
  if (size > MAX_FILE_BYTES) {
    return `That file is ${formatFileSize(size)}. The limit is ${formatFileSize(MAX_FILE_BYTES)}.`;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb >= 100 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}

/**
 * A name that is safe in a storage path: letters, digits, dot, dash and
 * underscore only, no leading dot, extension kept.
 */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const ext = fileExtension(base);
  const stem = (ext ? base.slice(0, -(ext.length + 1)) : base)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 80);
  return `${stem || "file"}.${ext}`;
}

/** What the website shows as the file's name: tidy, but still readable. */
export function displayFileName(name: string): string {
  return (name.split(/[\\/]/).pop() ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120);
}

const UPLOAD_ID_RE = "[a-f0-9]{12}";
const STORED_NAME_RE = `${UPLOAD_ID_RE}-[A-Za-z0-9][A-Za-z0-9_-]{0,80}\\.[a-z0-9]{1,5}`;

/** Where the browser uploads a file to: resources/<category>/<id>-<safe name>. */
export function newStoragePath(category: string, fileName: string, id: string): string {
  return `resources/${category}/${id}-${safeFileName(fileName)}`;
}

/**
 * The server never trusts a path from the browser: it must sit in this
 * category's folder and look exactly like one we'd have generated.
 */
export function isValidResourcePath(path: string, category: string): boolean {
  const prefix = `resources/${category}/`;
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  if (!new RegExp(`^${STORED_NAME_RE}$`).test(rest)) return false;
  return isAllowedExtension(fileExtension(rest));
}

/** True when the file's first bytes are what its extension claims. */
export function bytesMatchExtension(ext: string, bytes: Uint8Array): boolean {
  const startsWith = (...sig: number[]) => sig.every((value, i) => bytes[i] === value);
  switch (ext) {
    case "pdf":
      return startsWith(0x25, 0x50, 0x44, 0x46); // %PDF
    case "doc":
    case "ppt":
    case "xls":
      return startsWith(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    case "docx":
    case "pptx":
    case "xlsx":
      return startsWith(0x50, 0x4b, 0x03, 0x04); // zip container
    case "mp3":
      return (
        startsWith(0x49, 0x44, 0x33) || // ID3 tag
        (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0) // frame sync
      );
    default:
      return false;
  }
}

/** The bytes the server needs to read to run bytesMatchExtension. */
export const SNIFF_BYTES = 8;

export const MAX_LINK_LENGTH = 500;

/** A clean http(s) address, or null. Anything else (javascript:, data:, ...) is refused. */
export function normaliseLinkUrl(input: string): string | null {
  const value = input.trim();
  if (!value || value.length > MAX_LINK_LENGTH || /\s/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!url.hostname.includes(".")) return null;
  return url.toString();
}

// ---- ordering ---------------------------------------------------------------

export type OrderedResource = { order?: number; createdAt: number };

/**
 * Items the content manager has given a position come first, in that order.
 * The rest follow, newest first (so a new sermon shows at the top).
 */
export function sortResources<T extends OrderedResource>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aPinned = typeof a.order === "number";
    const bPinned = typeof b.order === "number";
    if (aPinned && bPinned) return (a.order as number) - (b.order as number) || b.createdAt - a.createdAt;
    if (aPinned) return -1;
    if (bPinned) return 1;
    return b.createdAt - a.createdAt;
  });
}

// ---- what the website and admin pass around -----------------------------------

export type ResourceItem = {
  id: string;
  title: string;
  description?: string;
  kind: "file" | "link";
  /** The download address (file) or the web address (link). */
  url: string;
  fileName?: string;
  /** Extension without the dot, e.g. "pdf". */
  fileType?: string;
  fileSize?: number;
  order?: number;
  createdAt: number;
};

/** "PDF · 2.4 MB", "Link", etc. */
export function resourceMeta(item: ResourceItem): string {
  if (item.kind === "link") return "Link";
  const info = item.fileType ? FILE_TYPES[item.fileType] : undefined;
  const label = info ? FILE_KIND_LABEL[info.kind] : "File";
  return item.fileSize ? `${label} · ${formatFileSize(item.fileSize)}` : label;
}

/** The short badge text: PDF, PPT, DOC, XLS, MP3 or LINK. */
export function resourceBadge(item: ResourceItem): string {
  if (item.kind === "link") return "LINK";
  const ext = item.fileType ?? "";
  if (ext === "pptx") return "PPT";
  if (ext === "docx") return "DOC";
  if (ext === "xlsx") return "XLS";
  return ext ? ext.toUpperCase() : "FILE";
}
