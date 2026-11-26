import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { api } from "./lib/api";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { RoadmapPage } from "./pages/RoadmapPage";
import { TopicStudyPage } from "./pages/TopicStudyPage";
import { TheoryQuestionsPage } from "./pages/TheoryQuestionsPage";
import { CodingArenaPage } from "./pages/CodingArenaPage";
import { OutputArenaPage } from "./pages/OutputArenaPage";
import { ComparisonsPage } from "./pages/ComparisonsPage";
import { DesignsPage } from "./pages/DesignsPage";
import { SolidModernPage } from "./pages/SolidModernPage";
import { MockInterviewsPage } from "./pages/MockInterviewsPage";
import { RevisionCenterPage } from "./pages/RevisionCenterPage";
import { StudyPlanPage } from "./pages/StudyPlanPage";
import { SettingsPage } from "./pages/SettingsPage";

export const App: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [compilerAvailable, setCompilerAvailable] = useState(true);
  const [compilerName, setCompilerName] = useState("g++");

  useEffect(() => {
    api
      .health()
      .then((res) => {
        setCompilerAvailable(res.compilerAvailable);
        setCompilerName(res.compilerName);
      })
      .catch(() => {
        setCompilerAvailable(false);
        setCompilerName("Offline");
      });

    api
      .settings()
      .then((res) => {
        const nextTheme = res.profile.theme === "light" ? "light" : "dark";
        setTheme(nextTheme);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleSetTheme = (next: "dark" | "light") => {
    setTheme(next);
    api.updateSettings({ theme: next }).catch(() => {});
  };

  return (
    <BrowserRouter>
      <AppShell
        theme={theme}
        onToggleTheme={() => handleSetTheme(theme === "dark" ? "light" : "dark")}
        compilerAvailable={compilerAvailable}
        compilerName={compilerName}
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/topics/:id" element={<TopicStudyPage />} />
          <Route path="/theory" element={<TheoryQuestionsPage />} />
          <Route path="/coding" element={<CodingArenaPage theme={theme} />} />
          <Route path="/outputs" element={<OutputArenaPage />} />
          <Route path="/comparisons" element={<ComparisonsPage />} />
          <Route path="/designs" element={<DesignsPage />} />
          <Route path="/solid-modern" element={<SolidModernPage />} />
          <Route path="/mocks" element={<MockInterviewsPage />} />
          <Route path="/revisions" element={<RevisionCenterPage />} />
          <Route path="/study-plan" element={<StudyPlanPage />} />
          <Route
            path="/settings"
            element={
              <SettingsPage
                theme={theme}
                onChangeTheme={handleSetTheme}
                compilerAvailable={compilerAvailable}
                compilerName={compilerName}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
};

export default App;
