const fs = require("fs");
const xml = fs.readFileSync("_docx_extract/word/document.xml", "utf8");
const rels = fs.readFileSync("_docx_extract/word/_rels/document.xml.rels", "utf8");
const draws = [...xml.matchAll(/wp:docPr[^>]*name="([^"]*)"/g)].map((m) => m[1]);
console.log("drawings", draws.length);
console.log("last draw names", draws.slice(-10));
const tail = xml.slice(-250000);
const rids = [...tail.matchAll(/r:embed="(rId\d+)"/g)].map((m) => m[1]);
const uniq = [...new Set(rids)];
console.log("tail rIds", uniq);
for (const rid of uniq) {
  const m = rels.match(new RegExp('Id="' + rid + '"[^>]*Target="([^"]+)"'));
  console.log(rid, "->", m && m[1]);
}
const p = fs.readFileSync("extracted_book_fresh.txt", "utf8");
for (const k of [
  "מודרציית דיווחים",
  "לוח בקרה Admin",
  "DisCancel",
  "החלפת אולם",
  "P3.1",
  "דחייה אוטומטית",
  "שירות Email",
  "72 שעה",
  "עדכון לפני שמאשר",
  "DFD0 + DFD1",
]) {
  console.log(k, p.includes(k) ? "YES" : "no");
}
