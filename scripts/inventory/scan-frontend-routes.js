#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function findRouterEntry() {
  const preferred = path.join(process.cwd(), "zephix-frontend", "src", "App.tsx");
  if (fs.existsSync(preferred)) return preferred;

  const srcRoot = path.join(process.cwd(), "zephix-frontend", "src");
  const candidates = [];
  walk(srcRoot, (fp) => {
    if (!fp.endsWith(".tsx") && !fp.endsWith(".ts")) return;
    const txt = safeRead(fp);
    if (!txt) return;
    if (txt.includes("BrowserRouter") && txt.includes("<Routes") && txt.includes("<Route")) {
      candidates.push(fp);
    }
  });

  if (candidates.length > 0) return candidates[0];
  return null;
}

function walk(dir, onFile) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const fp = path.join(dir, it.name);
    if (it.isDirectory()) walk(fp, onFile);
    else onFile(fp);
  }
}

function safeRead(fp) {
  try {
    return fs.readFileSync(fp, "utf8");
  } catch {
    return null;
  }
}

function getLineNumber(text, idx) {
  return text.slice(0, idx).split("\n").length;
}

function extractRouteTags(text) {
  const tags = [];
  const re = /<Route\b[^>]*\/?>/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    tags.push({ raw: m[0], index: m.index });
  }
  return tags;
}

function parseAttr(raw, attr) {
  const re1 = new RegExp(attr + String.raw`=\s*"([^"]*)"`);
  const m1 = raw.match(re1);
  if (m1) return { value: m1[1], literal: true };

  const re2 = new RegExp(attr + String.raw`=\s*\{([^}]*)\}`);
  const m2 = raw.match(re2);
  if (m2) return { value: m2[1].trim(), literal: false };

  return null;
}

function main() {
  const entry = findRouterEntry();
  const routes = [];

  if (!entry) {
    console.log(JSON.stringify({
      generatedAt: null,
      gitSha: null,
      routerEntry: null,
      routes: [],
      errors: ["Router entry file not found"]
    }, null, 2));
    return;
  }

  const text = readText(entry);
  const tags = extractRouteTags(text);

  for (const t of tags) {
    const line = getLineNumber(text, t.index);
    const pathAttr = parseAttr(t.raw, "path");
    const indexAttr = /\bindex\b/.test(t.raw);
    const elementAttr = parseAttr(t.raw, "element");

    const r = {
      file: normalize(entry),
      line,
      raw: t.raw,
      path: null,
      index: Boolean(indexAttr),
      element: null,
      ambiguous: false,
      ambiguousReason: ""
    };

    if (pathAttr) {
      r.path = pathAttr.value;
      if (!pathAttr.literal) {
        r.ambiguous = true;
        r.ambiguousReason = "path is not a string literal";
      }
    } else if (!indexAttr) {
      r.ambiguous = true;
      r.ambiguousReason = "missing path and not index route";
    }

    if (elementAttr) {
      r.element = elementAttr.value;
      if (!elementAttr.literal) {
        r.ambiguous = true;
        r.ambiguousReason = r.ambiguousReason ? (r.ambiguousReason + " plus element is not a string literal") : "element is not a string literal";
      }
    }

    routes.push(r);
  }

  const out = {
    generatedAt: null,
    gitSha: null,
    routerEntry: normalize(entry),
    routes
  };

  console.log(JSON.stringify(out, null, 2));
}

function normalize(p) {
  return p.split(path.sep).join("/");
}

main();
