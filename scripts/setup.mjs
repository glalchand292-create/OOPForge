import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function copyEnvIfMissing(exampleRel, targetRel) {
  const examplePath = path.join(ROOT, exampleRel);
  const targetPath = path.join(ROOT, targetRel);
  if (fs.existsSync(examplePath) && !fs.existsSync(targetPath)) {
    fs.copyFileSync(examplePath, targetPath);
    console.log(`Created ${targetRel} from ${exampleRel}`);
  }
}

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

copyEnvIfMissing(".env.example", ".env");
copyEnvIfMissing("backend/.env.example", "backend/.env");

run("npm --prefix backend install");
run("npm --prefix frontend install");
run("npm --prefix backend run db:generate");
run("npm --prefix backend run db:migrate");

console.log("\nOOPForge setup complete! Run `npm run dev` to launch backend + frontend.");
