import { build } from "esbuild";
import { spawn } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const testsDir = path.join(rootDir, "tests");
const outDir = path.join(rootDir, ".test-dist");

const esbuildDefine = {
  "import.meta.env.DEV": "false",
  "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
  "import.meta.env.SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
  "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature"),
  "import.meta.env.SUPABASE_ANON_KEY": JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature"),
  "import.meta.env.VITE_TURNSTILE_SITE_KEY": JSON.stringify("test-site-key"),
};

const collectTestFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectTestFiles(fullPath);
      }

      return entry.name.endsWith(".test.ts") ? [fullPath] : [];
    }),
  );

  return files.flat();
};

const run = async () => {
  const testFiles = await collectTestFiles(testsDir);

  if (testFiles.length === 0) {
    throw new Error("No test files found under ./tests.");
  }

  await rm(outDir, { recursive: true, force: true });

  const builtFiles = [];

  for (const testFile of testFiles) {
    const relativePath = path.relative(testsDir, testFile).replace(/\.ts$/, ".mjs");
    const outfile = path.join(outDir, relativePath);
    await mkdir(path.dirname(outfile), { recursive: true });

    await build({
      entryPoints: [testFile],
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      target: "node20",
      sourcemap: "inline",
      tsconfig: path.join(rootDir, "tsconfig.app.json"),
      define: esbuildDefine,
      external: ["node:*"],
      logLevel: "silent",
    });

    builtFiles.push(outfile);
  }

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--test", ...builtFiles], {
      stdio: "inherit",
      cwd: rootDir,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Tests failed with exit code ${code ?? "unknown"}.`));
    });
  });
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
