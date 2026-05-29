/**
 * Post-build adapter: converts the standard Vite SSR output (dist/) into
 * Vercel Build Output API v3 (.vercel/output/).
 *
 * Run via:  bun run build:vercel
 * Which is: vite build && node scripts/build-vercel.mjs
 */

import { cp, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const OUT = ".vercel/output";
const FUNC = `${OUT}/functions/index.func`;

console.log("▶ Building Vercel output structure…");

// Clean previous output
if (existsSync(OUT)) await rm(OUT, { recursive: true });

// ── Static assets ────────────────────────────────────────────────────────────
// dist/client/ → .vercel/output/static/
await mkdir(`${OUT}/static`, { recursive: true });
await cp("dist/client", `${OUT}/static`, { recursive: true });
console.log("  ✓ Static assets copied to .vercel/output/static/");

// ── Edge function ────────────────────────────────────────────────────────────
// Copy the entire dist/server/ bundle into the function directory so that
// relative dynamic imports (e.g. ./assets/server-*.js) resolve correctly.
await mkdir(FUNC, { recursive: true });
await cp("dist/server", FUNC, { recursive: true });

// Thin entry wrapper: Vercel Edge expects a default-export function, not an
// object.  server.js exports { default: { fetch(req, env, ctx) } }, so we
// unwrap it here.
await writeFile(
  `${FUNC}/index.js`,
  [
    `import server from "./server.js"`,
    `export default (request) => server.fetch(request)`,
  ].join("\n"),
  "utf8",
);

// Vercel Edge function metadata
await writeFile(
  `${FUNC}/.vc-config.json`,
  JSON.stringify({ runtime: "edge", entrypoint: "index.js" }, null, 2),
  "utf8",
);
console.log("  ✓ Edge function created at .vercel/output/functions/index.func/");

// ── Routing config ───────────────────────────────────────────────────────────
// 1. Serve any matching static file from dist/client/ directly (CSS, JS, images…)
// 2. Everything else → index edge function (SSR)
await writeFile(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2,
  ),
  "utf8",
);
console.log("  ✓ Routing config written to .vercel/output/config.json");

console.log("✓ .vercel/output/ is ready — run: vercel deploy --prebuilt");
