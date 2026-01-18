#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

BACKEND_ROOT="zephix-backend/src"
TMP_FILE="$(mktemp)"

find "$BACKEND_ROOT" -type f -name "*.controller.ts" | sort > "$TMP_FILE"

python3 - "$TMP_FILE" <<'PY'
import json
import os
import re
import sys
from pathlib import Path

root = Path("zephix-backend/src")
controllers_file_list = sys.argv[1] if len(sys.argv) > 1 else None

files = []
if controllers_file_list and os.path.exists(controllers_file_list):
  with open(controllers_file_list, "r", encoding="utf-8") as f:
    files = [line.strip() for line in f.readlines() if line.strip()]
else:
  files = [str(p) for p in root.rglob("*.controller.ts")]

ctrl_re = re.compile(r'@Controller\((?P<arg>[^)]*)\)')
method_re = re.compile(r'@(Get|Post|Patch|Delete)\((?P<arg>[^)]*)\)')

def literal_str(arg: str):
  a = arg.strip()
  if not a:
    return ""
  m = re.match(r"""^['"]([^'"]*)['"]$""", a)
  if m:
    return m.group(1)
  return ""

def join_paths(base: str, sub: str):
  b = (base or "").strip()
  s = (sub or "").strip()
  if not b and not s:
    return ""
  if b and not b.startswith("/"):
    b = "/" + b
  if s and not s.startswith("/"):
    s = "/" + s
  if b.endswith("/"):
    b = b[:-1]
  return (b + s) if s else b

routes = []
controller_count = 0

for fp in files:
  if not fp:
    continue
  try:
    text = Path(fp).read_text(encoding="utf-8", errors="ignore")
  except Exception:
    continue

  controller_base = ""
  mctrl = ctrl_re.search(text)
  if mctrl:
    controller_base = literal_str(mctrl.group("arg"))
  controller_count += 1

  for m in method_re.finditer(text):
    verb = m.group(1).upper()
    raw_arg = m.group("arg").strip()
    sub = literal_str(raw_arg)
    path = join_paths(controller_base, sub)

    line = text.count("\n", 0, m.start()) + 1
    routes.append({
      "file": fp.replace("\\", "/"),
      "line": line,
      "method": verb,
      "controllerBase": controller_base,
      "decoratorArg": raw_arg,
      "path": path,
      "ambiguous": False if (raw_arg == "" or re.match(r"""^['"]""", raw_arg)) else True,
      "ambiguousReason": "" if (raw_arg == "" or re.match(r"""^['"]""", raw_arg)) else "Decorator arg is not a string literal"
    })

out = {
  "generatedAt": None,
  "gitSha": None,
  "sourceRoot": str(root).replace("\\", "/"),
  "controllerFiles": controller_count,
  "routes": routes
}

print(json.dumps(out, indent=2))
PY

rm -f "$TMP_FILE"
