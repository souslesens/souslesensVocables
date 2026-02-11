#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

const ARCH_ROOT =
  process.argv[2] ||
  "C:\\Users\\jbonzene\\SLS\\souslesensVocables\\docs\\docs\\devdoc\\codedoc\\architecture";

const BAD_NAMES = new Set(["css/index", "html/index", "sql/index"]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (let i = 0; i < entries.length; i++) {
    const ent = entries[i];
    const full = path.join(dir, ent.name);

    if (ent.isDirectory()) {
      await walk(full);
      continue;
    }

    if (ent.isFile() && ent.name.toLowerCase() === "index.md") {
      const prev = await fs.readFile(full, "utf8");
      const lines = prev.split(/\r?\n/);

      let changed = false;
      const out = [];

      for (let k = 0; k < lines.length; k++) {
        const t = lines[k].trim();
        // supprime uniquement les lignes d'entrée exactes css/index html/index sql/index
        if (BAD_NAMES.has(t)) {
          changed = true;
          continue;
        }
        out.push(lines[k]);
      }

      if (changed) {
        const next = out.join("\n");
        await fs.writeFile(full, next.endsWith("\n") ? next : next + "\n", "utf8");
        console.log("CLEANED:", full);
      }
    }
  }
}

walk(ARCH_ROOT).catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
