#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    src: process.cwd(),
    out: path.join(process.cwd(), "docs", "docs", "devdoc", "architecture"),
    maxDepth: 50,
    exclude: "",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const v = argv[i + 1];

    if (a === "--src" && v) {
      args.src = v;
      i += 1;
      continue;
    }
    if (a === "--out" && v) {
      args.out = v;
      i += 1;
      continue;
    }
    if (a === "--maxDepth" && v) {
      const n = Number(v);
      args.maxDepth = Number.isFinite(n) ? n : args.maxDepth;
      i += 1;
      continue;
    }
    if (a === "--exclude" && v) {
      args.exclude = v;
      i += 1;
      continue;
    }
  }

  return args;
}

function toPosix(p) {
  // Pour que les liens markdown soient propres sous Windows
  return p.split(path.sep).join("/");
}

function safeTitleFromRel(rel) {
  if (rel === "" || rel === ".") return "Project root";
  return rel;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function makeExcludeSet(extraExcludeCsv) {
  const base = [
    ".git",
    ".github",
    ".vscode",
    "jowl",
    "log",
    "logs",
    "node_modules",
    "sls-py-api",
    "tests",
    "views",
    "_build",
    "dist",
    "build",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
  ];

  const extra = String(extraExcludeCsv || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const out = new Set();
  for (let i = 0; i < base.length; i += 1) out.add(base[i]);
  for (let i = 0; i < extra.length; i += 1) out.add(extra[i]);
  return out;
}

function isSubPath(parentAbs, candidateAbs) {
  const parent = path.resolve(parentAbs);
  const cand = path.resolve(candidateAbs);

  if (parent === cand) return true;
  const rel = path.relative(parent, cand);
  // rel ne doit pas remonter (..)
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

async function listDirSorted(absDir) {
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

async function writeTextFile(targetPath, content) {
  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, content, "utf8");
}

function mdLink(text, relTarget) {
  return `[${text}](${toPosix(relTarget)})`;
}

function relLink(fromDir, toFile) {
  // liens relatifs dans le dossier de doc (pas dans le repo)
  const rel = path.relative(fromDir, toFile);
  return toPosix(rel);
}

function makeBreadcrumb(docDirAbs, parentDocDirAbs) {
  const parentIndex = path.join(parentDocDirAbs, "index.md");
  const rel = relLink(docDirAbs, parentIndex);
  return `${mdLink("⬅️ Retour", rel)}`;
}

async function generateForDir(params) {
  const {
    srcRootAbs,
    outRootAbs,
    dirAbs,
    relFromSrc,
    depth,
    maxDepth,
    excludeSet,
  } = params;

  // sortie correspondant à ce dossier
  const docDirAbs = path.join(outRootAbs, relFromSrc);
  await ensureDir(docDirAbs);

  const entries = await listDirSorted(dirAbs);

  const subDirs = [];
  const files = [];

  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];

    // Exclusion des dossiers cachés type ".xxx"
    if (e.isDirectory() && e.name.startsWith(".")) continue;

    const absChild = path.join(dirAbs, e.name);

    // Exclure le dossier de sortie (si dans l'arborescence source)
    if (e.isDirectory() && isSubPath(outRootAbs, absChild)) {
      continue;
    }

    if (e.isDirectory()) {
      if (excludeSet.has(e.name)) continue;
      subDirs.push(e.name);
    } else if (e.isFile()) {
      files.push(e.name);
    }
  }

  const title = safeTitleFromRel(relFromSrc);

  const lines = [];
  lines.push(`<!-- AUTO-GENERATED: do not edit by hand -->`);
  lines.push(`# ${title}`);
  lines.push("");

  if (relFromSrc !== "" && relFromSrc !== ".") {
    const parentRel = path.dirname(relFromSrc);
    const parentDocDirAbs = path.join(outRootAbs, parentRel === "." ? "" : parentRel);
    lines.push(makeBreadcrumb(docDirAbs, parentDocDirAbs));
    lines.push("");
  }

  // Sous-dossiers
  lines.push("## Dossiers");
  lines.push("");
  if (subDirs.length === 0) {
    lines.push("_Aucun sous-dossier._");
  } else {
    for (let i = 0; i < subDirs.length; i += 1) {
      const d = subDirs[i];
      const childIndexAbs = path.join(docDirAbs, d, "index.md");
      const rel = relLink(docDirAbs, childIndexAbs);
      lines.push(`- ${mdLink(d, rel)}`);
    }
  }
  lines.push("");

  // Fichiers
  lines.push("## Fichiers");
  lines.push("");
  if (files.length === 0) {
    lines.push("_Aucun fichier._");
  } else {
    const filesMdAbs = path.join(docDirAbs, "files.md");
    const rel = relLink(docDirAbs, filesMdAbs);
    lines.push(`- ${mdLink("Voir la liste des fichiers", rel)}`);
  }
  lines.push("");

  // Note profondeur
  if (depth >= maxDepth) {
    lines.push("> ⚠️ Profondeur maximale atteinte. Certaines sous-arborescences ne sont pas détaillées.");
    lines.push("");
  }

  await writeTextFile(path.join(docDirAbs, "index.md"), lines.join("\n"));

  // files.md
  if (files.length > 0) {
    const fl = [];
    fl.push(`<!-- AUTO-GENERATED: do not edit by hand -->`);
    fl.push(`# Fichiers — ${title}`);
    fl.push("");
    fl.push(makeBreadcrumb(docDirAbs, docDirAbs));
    fl.push("");
    fl.push("Liste des fichiers présents dans ce dossier (aucune copie n’est créée, uniquement une référence documentaire).");
    fl.push("");
    for (let i = 0; i < files.length; i += 1) {
      fl.push(`- \`${files[i]}\``);
    }
    fl.push("");
    await writeTextFile(path.join(docDirAbs, "files.md"), fl.join("\n"));
  }

  // Recurse
  if (depth >= maxDepth) return;

  for (let i = 0; i < subDirs.length; i += 1) {
    const d = subDirs[i];
    const childAbs = path.join(dirAbs, d);
    const childRel = relFromSrc ? path.join(relFromSrc, d) : d;

    await generateForDir({
      srcRootAbs,
      outRootAbs,
      dirAbs: childAbs,
      relFromSrc: childRel,
      depth: depth + 1,
      maxDepth,
      excludeSet,
    });
  }
}

async function main() {
  const args = parseArgs(process.argv);

  const srcRootAbs = path.resolve(args.src);
  const outRootAbs = path.resolve(args.out);

  const excludeSet = makeExcludeSet(args.exclude);

  // Important : exclure aussi le dossier docs de sortie si on est à l'intérieur de src
  // (on filtre par isSubPath(outRootAbs, absChild) dans la descente)

  await ensureDir(outRootAbs);

  // (optionnel) petit README d'entrée
  const rootIndex = path.join(outRootAbs, "index.md");
  if (!(await fileExists(rootIndex))) {
    // on le générera par generateForDir, mais on s'assure qu'il existe ensuite
  }

  await generateForDir({
    srcRootAbs,
    outRootAbs,
    dirAbs: srcRootAbs,
    relFromSrc: "",
    depth: 0,
    maxDepth: args.maxDepth,
    excludeSet,
  });

  // Petit fichier “entrypoint” pour l’intégration Sphinx/MyST si besoin
  const entryAbs = path.join(outRootAbs, "README.md");
  const entry = [];
  entry.push(`<!-- AUTO-GENERATED -->`);
  entry.push(`# Architecture globale`);
  entry.push("");
  entry.push(`Point d’entrée : ${mdLink("index.md", "./index.md")}`);
  entry.push("");
  await writeTextFile(entryAbs, entry.join("\n"));

  // eslint-disable-next-line no-console
  console.log(`Done. Architecture docs generated in: ${outRootAbs}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
