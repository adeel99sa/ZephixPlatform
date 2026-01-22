#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

OUT_DIR="docs/generated"
mkdir -p "$OUT_DIR"

NOW_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
GIT_SHA="$(git rev-parse HEAD)"

BACKEND_ROUTES_JSON="$OUT_DIR/backend_routes.json"
FRONTEND_ROUTES_JSON="$OUT_DIR/frontend_routes.json"
INVENTORY_JSON="$OUT_DIR/inventory.json"
METHODOLOGY_JSON="$OUT_DIR/methodology.json"

echo "Generating architecture inventory"
echo "gitSha=$GIT_SHA"
echo "generatedAt=$NOW_ISO"
echo "outDir=$OUT_DIR"

bash scripts/inventory/scan-backend-routes.sh > "$BACKEND_ROUTES_JSON"
node scripts/inventory/scan-frontend-routes.js > "$FRONTEND_ROUTES_JSON"

BACKEND_CONTROLLER_COUNT="$(bash scripts/inventory/scan-backend-controllers.sh)"
BACKEND_SERVICE_COUNT="$(bash scripts/inventory/scan-backend-services.sh)"
BACKEND_MODULE_COUNT="$(bash scripts/inventory/scan-modules.sh)"
ENTITY_COUNT="$(bash scripts/inventory/scan-entities.sh)"
MIGRATION_COUNT="$(bash scripts/inventory/scan-migrations.sh)"
FRONTEND_PAGE_FILE_COUNT="$(bash scripts/inventory/scan-frontend-pages.sh)"

BACKEND_ENDPOINT_COUNT="$(node -e "const x=require('./$BACKEND_ROUTES_JSON'); console.log(Array.isArray(x.routes)?x.routes.length:0)")"
FRONTEND_ROUTE_COUNT="$(node -e "const x=require('./$FRONTEND_ROUTES_JSON'); console.log(Array.isArray(x.routes)?x.routes.filter(r=>!r.ambiguous).length:0)")"
FRONTEND_ROUTE_AMBIGUOUS_COUNT="$(node -e "const x=require('./$FRONTEND_ROUTES_JSON'); console.log(Array.isArray(x.routes)?x.routes.filter(r=>r.ambiguous).length:0)")"

node - <<NODE
const fs = require("fs");

const payload = {
  generatedAt: "${NOW_ISO}",
  gitSha: "${GIT_SHA}",
  counts: {
    backend: {
      modules: Number("${BACKEND_MODULE_COUNT}"),
      controllers: Number("${BACKEND_CONTROLLER_COUNT}"),
      services: Number("${BACKEND_SERVICE_COUNT}"),
      endpoints: Number("${BACKEND_ENDPOINT_COUNT}"),
      entities: Number("${ENTITY_COUNT}"),
      migrations: Number("${MIGRATION_COUNT}")
    },
    frontend: {
      pageFiles: Number("${FRONTEND_PAGE_FILE_COUNT}"),
      routes: Number("${FRONTEND_ROUTE_COUNT}"),
      routesAmbiguous: Number("${FRONTEND_ROUTE_AMBIGUOUS_COUNT}")
    }
  },
  sources: {
    backendRoutes: "${BACKEND_ROUTES_JSON}",
    frontendRoutes: "${FRONTEND_ROUTES_JSON}"
  }
};

fs.writeFileSync("${INVENTORY_JSON}", JSON.stringify(payload, null, 2));
console.log("Wrote ${INVENTORY_JSON}");
NODE

node - <<NODE
const fs = require("fs");

const methodology = {
  generatedAt: "${NOW_ISO}",
  gitSha: "${GIT_SHA}",
  definitions: {
    apiEndpoint: "One Nest controller method with @Get, @Post, @Patch, or @Delete decorator",
    backendModule: "One top-level directory under zephix-backend/src/modules",
    entity: "One file ending with .entity.ts under zephix-backend/src",
    migration: "One .ts file under any directory path containing migrations under zephix-backend/src",
    frontendPageFile: "One .tsx file under zephix-frontend/src/pages",
    frontendRoute: "One <Route> element in the router entry file used by the app. Ambiguous routes are tracked separately"
  },
  tools: {
    shell: "bash",
    backendSearch: "grep",
    frontendParser: "node",
    jsonWriter: "node"
  },
  limitations: [
    "Frontend routes parser is conservative. It flags ambiguous routes when path is not a string literal.",
    "Backend routes scan extracts decorator parameters only when they are string literals."
  ]
};

fs.writeFileSync("${METHODOLOGY_JSON}", JSON.stringify(methodology, null, 2));
console.log("Wrote ${METHODOLOGY_JSON}");
NODE

echo "Done"
echo "inventory=$INVENTORY_JSON"
echo "backendRoutes=$BACKEND_ROUTES_JSON"
echo "frontendRoutes=$FRONTEND_ROUTES_JSON"
echo "methodology=$METHODOLOGY_JSON"
