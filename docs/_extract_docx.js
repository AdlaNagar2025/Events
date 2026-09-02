const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const docsDir = __dirname;
const docx = fs.readdirSync(docsDir).find((f) => f.endsWith(".docx"));
if (!docx) {
  console.error("No docx found");
  process.exit(1);
}
const docxPath = path.join(docsDir, docx);
const zipPath = path.join(docsDir, "_book.zip");
const tmp = path.join(docsDir, "_docx_extract");

fs.copyFileSync(docxPath, zipPath);
fs.rmSync(tmp, { recursive: true, force: true });
execSync(
  `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force"`,
);

const xml = fs.readFileSync(path.join(tmp, "word", "document.xml"), "utf8");
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

const paras = xml
  .split(/<w:p[ >]/)
  .slice(1)
  .map((p) => {
    const ts = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
    return decode(ts.join(""));
  })
  .filter(Boolean);

fs.writeFileSync(path.join(docsDir, "extracted_book_fresh.txt"), paras.join("\n"), "utf8");
console.log("docx:", docx);
console.log("paras:", paras.length);
console.log("mtime:", fs.statSync(docxPath).mtime.toISOString());
console.log("size:", fs.statSync(docxPath).size);

const keys = [
  "1.1",
  "1.2",
  "1.3",
  "טבלת דרישות שהשתנו",
  "דיאגרמת הקשר",
  "Context",
  "DFD0",
  "DFD1",
  "P3.1",
  "P3.2",
  "P3.3",
  "P3.4",
  "P5.1",
  "P5.2",
  "P5.3",
  "P5.4",
  "P6.1",
  "P6.2",
  "P6.3",
  "P6.4",
  "מודרצ",
  "לוח בקרה",
  "DisCancel",
  "Fix place",
  "החלפת אולם",
  "Reject",
  "שירות Email",
  "התראות In-App",
  "72 שעה",
  "עדכון לפני שמאשר",
];
for (const k of keys) {
  const hits = paras.map((l, i) => (l.includes(k) ? i : -1)).filter((i) => i >= 0);
  console.log(`${k} -> count=${hits.length}`);
}

const start = paras.findIndex((l) => l.includes("טבלת דרישות שהשתנו"));
console.log("\n=== FROM 1.1 TABLE HEAD ===");
console.log(paras.slice(start, start + 30).join("\n"));

const cStart = paras.findIndex((l) => l.includes("דיאגרמת הקשר") || l.includes("Context"));
console.log("\n=== CONTEXT SECTION ===");
console.log(paras.slice(cStart, cStart + 40).join("\n"));

// P3-P6 dictionary
const p3 = paras.findIndex((l) => l.trim() === "P3" || l.trim() === "P3 ");
const idx = paras.findIndex((l, i) => i > 1200 && /^P3\s*$/.test(l.trim()));
const idx2 = paras.findIndex((l, i) => i > 1100 && l.includes("ניהול מערכת") && paras[i - 1] && paras[i - 1].includes("P3"));
console.log("\n=== PROCESS DICT SLICE ===");
const dictStart = paras.findIndex((l) => l.includes("תיאור תהליכים") || (l.trim() === "P1" && paras[i + 1] && false));
// find P1 followed by ניהול משתמשים
let d0 = -1;
for (let i = 0; i < paras.length; i++) {
  if (/^P1\s*$/.test(paras[i].trim()) && paras[i + 1] && paras[i + 1].includes("ניהול משתמשים")) {
    d0 = i;
    break;
  }
}
console.log("dictStart", d0);
console.log(paras.slice(d0, d0 + 120).join("\n"));

console.log("\n=== LAST 60 ===");
console.log(paras.slice(-60).join("\n"));
