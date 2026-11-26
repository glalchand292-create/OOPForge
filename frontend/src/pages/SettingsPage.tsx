import React, { useEffect, useState } from "react";
import { Download, Upload, Save, Sun, Moon, Cpu } from "lucide-react";
import { api } from "../lib/api";
import { Badge } from "../components/Badge";

interface SettingsPageProps {
  theme: "dark" | "light";
  onChangeTheme: (next: "dark" | "light") => void;
  compilerAvailable: boolean;
  compilerName: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  theme,
  onChangeTheme,
  compilerAvailable,
  compilerName,
}) => {
  const [displayName, setDisplayName] = useState("CSE Candidate");
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState(75);
  const [savedNotice, setSavedNotice] = useState("");
  const [importStatus, setImportStatus] = useState("");

  useEffect(() => {
    api.settings().then((res) => {
      setDisplayName(res.profile.displayName);
      setDailyTargetMinutes(res.profile.dailyTargetMinutes);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updateSettings({ displayName, dailyTargetMinutes, theme });
    setSavedNotice("Settings saved to SQLite.");
    setTimeout(() => setSavedNotice(""), 2000);
  };

  const handleExport = async () => {
    const payload = await api.exportProgress();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oopforge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as { data?: unknown };
      if (!parsed.data) {
        setImportStatus("Invalid backup JSON: missing 'data' key.");
        return;
      }
      await api.importProgress({ data: parsed.data });
      setImportStatus("Backup imported successfully! Reloading profile...");
      const res = await api.settings();
      setDisplayName(res.profile.displayName);
      setDailyTargetMinutes(res.profile.dailyTargetMinutes);
      onChangeTheme(res.profile.theme);
    } catch (err) {
      setImportStatus(`Import failed: ${String(err)}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings & Local Data Backup</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          All progress, C++17 submissions, spaced repetition schedules, and notes are persisted locally in SQLite.
        </p>
      </div>

      {/* Profile & Study Target */}
      <form onSubmit={handleSave} className="panel p-5 space-y-4">
        <h2 className="text-sm font-semibold">Profile & Appearance</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Daily Study Target (minutes)
            </label>
            <input
              type="number"
              min={15}
              max={480}
              value={dailyTargetMinutes}
              onChange={(e) => setDailyTargetMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">Theme:</span>
            <button
              type="button"
              onClick={() => onChangeTheme("dark")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border cursor-pointer ${
                theme === "dark"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                  : "border-[var(--border-subtle)]"
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Dark
            </button>
            <button
              type="button"
              onClick={() => onChangeTheme("light")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border cursor-pointer ${
                theme === "light"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                  : "border-[var(--border-subtle)]"
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Light
            </button>
          </div>

          <div className="flex items-center gap-3">
            {savedNotice && <span className="text-xs text-[var(--success)]">{savedNotice}</span>}
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent-strong)] text-white text-xs font-medium cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Preferences
            </button>
          </div>
        </div>
      </form>

      {/* Sandbox Diagnostics */}
      <div className="panel p-5 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--accent)]" /> C++17 Execution Sandbox
          </h2>
          <Badge variant={compilerAvailable ? "success" : "warning"}>
            {compilerAvailable ? `Active (${compilerName} -std=c++17)` : "Compiler Unavailable"}
          </Badge>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Code executes in an isolated temporary directory with strict 10s compile timeout, 3s execution timeout, 128KB stdout cap, and blocked process/OS headers.
        </p>
      </div>

      {/* Export / Import */}
      <div className="panel p-5 space-y-4">
        <h2 className="text-sm font-semibold">Progress Export & Restore</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-xs font-medium hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" /> Export JSON Backup
          </button>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-xs font-medium hover:bg-[var(--bg-hover)] cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[var(--success)]" />
            <span>Import JSON Backup</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
        {importStatus && <div className="text-xs text-[var(--accent)]">{importStatus}</div>}
      </div>
    </div>
  );
};
