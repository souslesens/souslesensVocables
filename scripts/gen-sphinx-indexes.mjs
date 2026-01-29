#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo root: script is in <repo>/docs/scripts/
const repoRoot = path.resolve(__dirname, "..");

// Sphinx sources live here (chez toi c'est bien docs/docs/...)
const docsSrcRoot = path.join(repoRoot, "docs", "docs");
const devdocRoot = path.join(docsSrcRoot, "devdoc");
const codedocRoot = path.join(devdocRoot, "codedoc");
const architectureOutRoot = path.join(codedocRoot, "architecture");

// Ce que tu veux indexer depuis la racine du projet
const TOP_DIRS = [
  "api",
  "bin",
  "config",
  "config_templates",
  "data",
  "mainapp",
  "model",
  "plugins",
  "public",
  "scripts",
];

// Exclusions côté code (scan)
const IGNORE_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".idea",
  ".vscode",
  "__pycache__",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".cache",
  "tmp",
  "temp",
  // on évite de rescanner la doc
  "docs",
]);

const MAX_DEPTH = 12; // profondeur max de scan
const TOCTREE_MAXDEPTH = 99; // pour que tout soit déroulable "jusqu'à la fin"

function sortAlpha(a, b) {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch (e) {
    return false;
  }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function toctreeBlock(options) {
  const caption = options.caption;
  const maxdepth = options.maxdepth;
  const entries = options.entries || [];

  const lines = [];
  lines.push("```{toctree}");
  if (typeof maxdepth === "number") lines.push(`:maxdepth: ${maxdepth}`);
  if (caption && caption.length > 0) lines.push(`:caption: ${caption}`);
  lines.push("");

  for (let i = 0; i < entries.length; i++) {
    lines.push(entries[i]);
  }

  lines.push("```");
  return lines.join("\n");
}

function makeTitleFromName(name) {
  const s = String(name).replace(/_/g, " ");
  if (!s) return name;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function listDir(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const dirs = [];
  const files = [];

  for (let i = 0; i < entries.length; i++) {
    const ent = entries[i];
    const name = ent.name;

    if (ent.isDirectory()) {
      if (!IGNORE_DIR_NAMES.has(name)) dirs.push(name);
    } else if (ent.isFile()) {
      if (name === ".DS_Store") continue;
      files.push(name);
    }
  }

  dirs.sort(sortAlpha);
  files.sort(sortAlpha);
  return { dirs, files };
}

async function listMarkdownFilesAtRoot(dirPath) {
  // Retourne les docnames Sphinx (sans .md) des fichiers .md présents DIRECTEMENT dans dirPath
  // Exclut index.md
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const md = [];

  for (let i = 0; i < entries.length; i++) {
    const ent = entries[i];
    if (!ent.isFile()) continue;

    const name = ent.name;
    if (!name.toLowerCase().endsWith(".md")) continue;
    if (name.toLowerCase() === "index.md") continue;

    // Sphinx/MyST: docname sans extension
    md.push(name.slice(0, -3));
  }

  md.sort(sortAlpha);
  return md;
}

async function writeFileIfChanged(filePath, content) {
  const contentFinal = content.endsWith("\n") ? content : content + "\n";
  let prev = "";
  if (await exists(filePath)) {
    prev = await fs.readFile(filePath, "utf8");
  }
  if (prev !== contentFinal) {
    await fs.writeFile(filePath, contentFinal, "utf8");
  }
}

async function generateFilesPage(outDir, relDocDir, files) {
  const title = "Files";
  const header = [
    "<!-- AUTO-GENERATED: do not edit by hand -->",
    `# ${title}`,
    "",
    `Directory: \`${relDocDir || "."}\``,
    "",
  ];

  if (!files || files.length === 0) {
    header.push("_No files in this directory._");
    header.push("");
    return writeFileIfChanged(path.join(outDir, "files.md"), header.join("\n"));
  }

  header.push("## List");
  header.push("");
  for (let i = 0; i < files.length; i++) {
    header.push(`- \`${files[i]}\``);
  }
  header.push("");

  await writeFileIfChanged(path.join(outDir, "files.md"), header.join("\n"));
}

async function generateIndexPage(outDir, title, caption, maxdepth, subdirNames) {
  const header = [
    "<!-- AUTO-GENERATED: do not edit by hand -->",
    `# ${title}`,
    "",
  ];

  const entries = [];

  // Sous-dossiers => sub/index (rend la sidebar déroulable)
  if (subdirNames && subdirNames.length > 0) {
    for (let i = 0; i < subdirNames.length; i++) {
      entries.push(`${subdirNames[i]}/index`);
    }
  }

  // Page de listing des fichiers du dossier
  entries.push("files");

  header.push(toctreeBlock({ caption, maxdepth, entries }));
  header.push("");

  await writeFileIfChanged(path.join(outDir, "index.md"), header.join("\n"));
}

async function mirrorTreeAndGenerate(inputDir, outputDir, relOutFromArchRoot, depth) {
  if (depth > MAX_DEPTH) return;

  await ensureDir(outputDir);

  const listed = await listDir(inputDir);
  const dirs = listed.dirs;
  const files = listed.files;

  await generateFilesPage(outputDir, relOutFromArchRoot, files);

  const title = makeTitleFromName(path.basename(outputDir));
  await generateIndexPage(outputDir, title, "Contents", TOCTREE_MAXDEPTH, dirs);

  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i];
    const inChild = path.join(inputDir, d);
    const outChild = path.join(outputDir, d);
    const relChild = relOutFromArchRoot ? path.join(relOutFromArchRoot, d) : d;
    await mirrorTreeAndGenerate(inChild, outChild, relChild, depth + 1);
  }
}

async function main() {
  if (!(await exists(docsSrcRoot))) {
    console.error("ERROR: docsSrcRoot not found:", docsSrcRoot);
    process.exit(1);
  }

  await ensureDir(architectureOutRoot);
  await ensureDir(codedocRoot);

  // 1) Génère les pages architecture/<topdir>/...
  const validTopDirs = [];
  for (let i = 0; i < TOP_DIRS.length; i++) {
    const name = TOP_DIRS[i];
    const src = path.join(repoRoot, name);
    if (await exists(src)) validTopDirs.push(name);
  }

  // Architecture root index.md (page “Code Architecture”)
  {
    const header = [
      "<!-- AUTO-GENERATED: do not edit by hand -->",
      "# Code Architecture",
      "",
      toctreeBlock({
        caption: "Architecture",
        maxdepth: TOCTREE_MAXDEPTH,
        entries: validTopDirs.map((d) => `${d}/index`),
      }),
      "",
    ];
    await writeFileIfChanged(path.join(architectureOutRoot, "index.md"), header.join("\n"));
  }

  // 2) Génère chaque topdir
  for (let i = 0; i < validTopDirs.length; i++) {
    const d = validTopDirs[i];
    const src = path.join(repoRoot, d);
    const out = path.join(architectureOutRoot, d);
    await mirrorTreeAndGenerate(src, out, d, 1);
  }

  // 3) Génère codedoc/index.md :
  //    - ajoute TOUS les .md au niveau codedoc (mappingModeler, jsdoc, ...)
  //    - puis ajoute architecture/index
  {
    const mdAtCodedocRoot = await listMarkdownFilesAtRoot(codedocRoot);

    const entries = [];
    for (let i = 0; i < mdAtCodedocRoot.length; i++) {
      entries.push(mdAtCodedocRoot[i]);
    }
    entries.push("architecture/index");

    const header = [
      "<!-- AUTO-GENERATED: do not edit by hand -->",
      "# Code documentation",
      "",
      toctreeBlock({
        caption: "Code documentation",
        maxdepth: TOCTREE_MAXDEPTH,
        entries,
      }),
      "",
    ];
    await writeFileIfChanged(path.join(codedocRoot, "index.md"), header.join("\n"));
  }

  console.log("OK: generated Sphinx indexes");
  console.log("codedoc index:", path.join(codedocRoot, "index.md"));
  console.log("architecture root:", path.join(architectureOutRoot, "index.md"));
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
