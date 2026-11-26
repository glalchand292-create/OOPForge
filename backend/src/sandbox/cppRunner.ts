import { execFile, spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SandboxExecutionResult {
  sandboxAvailable: boolean;
  compiled: boolean;
  status:
    | "Passed"
    | "Wrong Answer"
    | "Compile Error"
    | "Runtime Error"
    | "Time Limit Exceeded"
    | "Sandbox Blocked"
    | "Sandbox Unavailable";
  stdout: string;
  stderr: string;
  compileOutput: string;
  runtimeMs: number;
  passed: boolean;
}

/**
 * SECURITY NOTICE:
 * Static regex checks below are ONLY basic guardrails for local self-study.
 * They DO NOT isolate untrusted C++ code (trivially bypassed via macros, token pasting,
 * #include path leaks, inline assembly, syscall(), sockets, std::thread, or OOM bombs).
 *
 * Public deployments MUST either disable host execution (default when NODE_ENV=production)
 * or delegate compilation/execution to OS-level microVMs / rootless containers
 * (e.g., Docker --network=none --read-only --pids-limit --memory --cpus, nsjail, isolate, or Firecracker).
 */
export function isLocalSandboxEnabled(): boolean {
  const flag = process.env.ENABLE_LOCAL_CPP_SANDBOX?.toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (process.env.NODE_ENV === "production") {
    return flag === "true" || flag === "1";
  }
  return true;
}

const FORBIDDEN_PATTERNS: { regex: RegExp; reason: string }[] = [
  { regex: /\bsystem\s*\(/, reason: "system() calls are blocked in local mode" },
  { regex: /\bpopen\s*\(/, reason: "popen() calls are blocked in local mode" },
  { regex: /\b_popen\s*\(/, reason: "_popen() calls are blocked in local mode" },
  { regex: /<\s*windows\.h\s*>/i, reason: "<windows.h> is blocked in local mode" },
  { regex: /<\s*filesystem\s*>/i, reason: "<filesystem> is blocked in local mode" },
  { regex: /<\s*sys\/socket\.h\s*>/i, reason: "Socket headers are blocked in local mode" },
  { regex: /<\s*winsock/i, reason: "WinSock headers are blocked in local mode" },
  { regex: /\bCreateProcess/i, reason: "Process creation APIs are blocked in local mode" },
  { regex: /\bfork\s*\(/, reason: "fork() is blocked in local mode" },
  { regex: /\bexec[lv]/, reason: "exec*() calls are blocked in local mode" },
  { regex: /\b__asm__\b|\basm\s*\(/, reason: "Inline assembly is blocked in local mode" },
];

let cachedCompiler: string | null | undefined;
let activeRuns = 0;
const MAX_CONCURRENT_RUNS = 2;

export async function detectCppCompiler(): Promise<string | null> {
  if (cachedCompiler !== undefined) return cachedCompiler;
  const candidates = [process.env.CPP_COMPILER, "g++", "clang++"].filter(Boolean) as string[];
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["--version"], { timeout: 3000 });
      cachedCompiler = bin;
      return bin;
    } catch {
      // try next
    }
  }
  cachedCompiler = null;
  return null;
}

function killProcessTree(pid: number | undefined) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // ignore
      }
    }
  }
}

export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export async function runCpp17InSandbox(
  code: string,
  expectedStdout?: string,
  stdinInput = ""
): Promise<SandboxExecutionResult> {
  if (!isLocalSandboxEnabled()) {
    return {
      sandboxAvailable: false,
      compiled: false,
      status: "Sandbox Unavailable",
      stdout: "",
      stderr:
        "Host C++ execution is disabled in this environment (NODE_ENV=production or ENABLE_LOCAL_CPP_SANDBOX=false). Use local development mode or attach an isolated container/microVM runner.",
      compileOutput: "Execution endpoint disabled by server configuration.",
      runtimeMs: 0,
      passed: false,
    };
  }

  if (code.length > 64 * 1024) {
    return {
      sandboxAvailable: true,
      compiled: false,
      status: "Sandbox Blocked",
      stdout: "",
      stderr: "Source code exceeds 64 KB limit.",
      compileOutput: "Source code exceeds 64 KB limit.",
      runtimeMs: 0,
      passed: false,
    };
  }

  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.regex.test(code)) {
      return {
        sandboxAvailable: true,
        compiled: false,
        status: "Sandbox Blocked",
        stdout: "",
        stderr: rule.reason,
        compileOutput: rule.reason,
        runtimeMs: 0,
        passed: false,
      };
    }
  }

  if (activeRuns >= MAX_CONCURRENT_RUNS) {
    return {
      sandboxAvailable: true,
      compiled: false,
      status: "Sandbox Blocked",
      stdout: "",
      stderr: "Runner busy (max 2 concurrent C++ runs). Please retry in a moment.",
      compileOutput: "Concurrency limit reached.",
      runtimeMs: 0,
      passed: false,
    };
  }

  const compiler = await detectCppCompiler();
  if (!compiler) {
    return {
      sandboxAvailable: false,
      compiled: false,
      status: "Sandbox Unavailable",
      stdout: "",
      stderr: "No local g++/clang++ compiler was found on PATH. Editor-only mode is active.",
      compileOutput: "C++17 compiler not found on host.",
      runtimeMs: 0,
      passed: false,
    };
  }

  activeRuns += 1;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "oopforge-run-"));
  const srcPath = path.join(tempDir, "solution.cpp");
  const exePath = path.join(tempDir, process.platform === "win32" ? "solution.exe" : "solution");

  try {
    await fs.writeFile(srcPath, code, "utf-8");

    // 1. Compile step (10s timeout, bounded template depth and error count)
    try {
      const { stderr: compileWarn } = await execFileAsync(
        compiler,
        [
          "-std=c++17",
          "-O2",
          "-Wall",
          "-Wextra",
          "-ftemplate-depth=64",
          "-fmax-errors=5",
          "-fno-diagnostics-show-caret",
          srcPath,
          "-o",
          exePath,
        ],
        {
          cwd: tempDir,
          timeout: 10000,
          maxBuffer: 256 * 1024,
          windowsHide: true,
        }
      );

      // 2. Execution step (3s timeout, 128KB output cap, stripped host env secrets)
      const start = Date.now();
      const execResult = await new Promise<{
        stdout: string;
        stderr: string;
        code: number | null;
        timedOut: boolean;
      }>((resolve) => {
        const child = spawn(exePath, [], {
          cwd: tempDir,
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
          detached: process.platform !== "win32",
          env: {
            PATH: process.env.PATH || "",
            SystemRoot: process.env.SystemRoot || "C:\\Windows",
          },
        });

        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const maxOut = 128 * 1024;

        const timer = setTimeout(() => {
          timedOut = true;
          killProcessTree(child.pid);
        }, 3000);

        child.stdout.on("data", (chunk: Buffer) => {
          if (stdout.length < maxOut) stdout += chunk.toString("utf-8");
        });
        child.stderr.on("data", (chunk: Buffer) => {
          if (stderr.length < maxOut) stderr += chunk.toString("utf-8");
        });

        child.on("close", (exitCode) => {
          clearTimeout(timer);
          resolve({ stdout, stderr, code: exitCode, timedOut });
        });

        if (stdinInput) {
          child.stdin.write(stdinInput.slice(0, 16 * 1024));
        }
        child.stdin.end();
      });

      const runtimeMs = Date.now() - start;

      if (execResult.timedOut) {
        return {
          sandboxAvailable: true,
          compiled: true,
          status: "Time Limit Exceeded",
          stdout: execResult.stdout,
          stderr: "Execution exceeded 3000 ms timeout and was terminated.",
          compileOutput: compileWarn || "Compiled cleanly with C++17.",
          runtimeMs,
          passed: false,
        };
      }

      if (execResult.code !== 0) {
        return {
          sandboxAvailable: true,
          compiled: true,
          status: "Runtime Error",
          stdout: execResult.stdout,
          stderr: execResult.stderr || `Process exited with code ${execResult.code}`,
          compileOutput: compileWarn || "Compiled cleanly with C++17.",
          runtimeMs,
          passed: false,
        };
      }

      const normActual = normalizeOutput(execResult.stdout);
      const normExpected =
        expectedStdout !== undefined ? normalizeOutput(expectedStdout) : undefined;
      const passed =
        normExpected !== undefined && normExpected.length > 0
          ? normActual === normExpected
          : normActual.length > 0;

      return {
        sandboxAvailable: true,
        compiled: true,
        status: passed ? "Passed" : "Wrong Answer",
        stdout: execResult.stdout.trimEnd(),
        stderr: execResult.stderr,
        compileOutput: compileWarn || "Compiled cleanly with C++17 (-std=c++17).",
        runtimeMs,
        passed,
      };
    } catch (compileErr: unknown) {
      const errObj = compileErr as { stderr?: string; message?: string };
      const msg = (errObj.stderr || errObj.message || "Compilation failed").replaceAll(
        tempDir + path.sep,
        ""
      );
      return {
        sandboxAvailable: true,
        compiled: false,
        status: "Compile Error",
        stdout: "",
        stderr: msg,
        compileOutput: msg,
        runtimeMs: 0,
        passed: false,
      };
    }
  } finally {
    activeRuns = Math.max(0, activeRuns - 1);
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
