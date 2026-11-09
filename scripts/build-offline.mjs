import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await mkdir("public/offline", { recursive: true });
await build({
  entryPoints: ["offline/main.tsx"],
  bundle: true,
  format: "esm",
  minify: true,
  jsx: "automatic",
  target: ["es2020"],
  outfile: "public/offline/app.js",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "eof",
});
const css = await postcss([tailwind()]).process(
  await readFile("app/globals.css", "utf8"),
  { from: "app/globals.css", to: "public/offline/app.css" },
);
await writeFile("public/offline/app.css", css.css);
const hash = createHash("sha256")
  .update(await readFile("public/offline/app.js"))
  .update(css.css)
  .update(await readFile("offline/sw-template.js"))
  .digest("hex")
  .slice(0, 12);
await writeFile(
  "public/offline/index.html",
  (await readFile("offline/index.template.html", "utf8")).replaceAll(
    "__OFFLINE_VERSION__",
    hash,
  ),
);
await writeFile(
  "public/sw.js",
  (await readFile("offline/sw-template.js", "utf8")).replaceAll(
    "__OFFLINE_VERSION__",
    hash,
  ),
);
const licenses = await Promise.all(
  [
    "node_modules/react/LICENSE",
    "node_modules/react-dom/LICENSE",
    "node_modules/chess.js/LICENSE",
    "public/puzzles-LICENSE.txt",
  ].map((p) => readFile(p, "utf8")),
);
await writeFile(
  "public/offline/LICENSES.txt",
  "Chess Infinity offline practice. Original lessons and pieces.\n\n" +
    licenses.join("\n\n"),
);
console.log("Built offline practice pack:", hash);
