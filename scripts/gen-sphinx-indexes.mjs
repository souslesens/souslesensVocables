import fs from "fs";
import path from "path";

const DOCS_ROOT = path.resolve("docs/docs"); // adapte si besoin
const DRY_RUN = process.argv.includes("--dry");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function write(p, content) {
  if (DRY_RUN) {
    console.log("[dry] write", p);
    return;
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
}

function hasH1(md) {
  return md.split(/\r?\n/).some((l) => l.trim().startsWith("# "));
}

function makeTitleFromFolder(folderName) {
  const clean = folderName.replace(/[_-]+/g, " ").trim();
  return clean.length ? clean[0].toUpperCase() + clean.slice(1) : "Index";
}

// Regroupe les fichiers par dossier
const files = walk(DOCS_ROOT);
const byDir = new Map();
for (const f of files) {
  const dir = path.dirname(f);
  if (!byDir.has(dir)) byDir.set(dir, []);
  byDir.get(dir).push(f);
}

// Pour chaque dossier, (re)crée un index.md
for (const [dir, mdFiles] of byDir.entries()) {
  const relDirFromDocs = path.relative(path.resolve("docs"), dir);
  const indexPath = path.join(dir, "index.md");

  // entries = tous les md du dossier sauf index.md
  const entries = mdFiles
    .filter((p) => path.basename(p).toLowerCase() !== "index.md")
    .map((p) => path.basename(p, ".md"));

  const folderTitle = makeTitleFromFolder(path.basename(dir));

  const toctree = [
    "```{toctree}",
    ":maxdepth: 2",
    ":caption: Contents",
    ...entries,
    "```",
    "",
  ].join("\n");

  let content = "";
  if (fs.existsSync(indexPath)) {
    content = read(indexPath);
    // si pas de titre H1, on l’ajoute en tête
    if (!hasH1(content)) content = `# ${folderTitle}\n\n` + content;
    // si pas de toctree, on le met en bas (ou on remplace un toctree existant si tu veux)
    if (!content.includes("```{toctree}")) content = content.trimEnd() + "\n\n" + toctree;
  } else {
    content = `# ${folderTitle}\n\n${toctree}`;
  }

  write(indexPath, content);
  console.log("OK:", toPosix(path.relative(process.cwd(), indexPath)));
}

console.log("Done.");
