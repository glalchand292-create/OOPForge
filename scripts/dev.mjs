import { spawn } from "node:child_process";

const procs = [
  spawn("npm", ["--prefix", "backend", "run", "dev"], { stdio: "inherit", shell: true }),
  spawn("npm", ["--prefix", "frontend", "run", "dev"], { stdio: "inherit", shell: true }),
];

function shutdown() {
  for (const p of procs) {
    try {
      p.kill();
    } catch {
      // ignore
    }
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
