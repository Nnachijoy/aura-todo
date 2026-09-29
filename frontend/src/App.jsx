import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import TaskList from "./components/TaskList";
import Board from "./components/Board";
import CalendarView from "./components/CalendarView";
import FocusView from "./components/FocusView";
import StatsView from "./components/StatsView";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import AIBriefing from "./components/AIBriefing";
import CommandPalette from "./components/CommandPalette";

export default function App() {
  const [view, setView] = useState("list");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-app text-app">
      <Sidebar
        view={view}
        setView={(v) => {
          setView(v);
          setSidebarOpen(false);
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur text-white"
        aria-label="Menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 lg:py-6 max-w-6xl mx-auto w-full">
        <div className="lg:hidden h-12" />
        <TopBar />
        <AIBriefing />
        <AnimatePresence mode="wait">
          {view === "list" && <TaskList key="list" />}
          {view === "kanban" && <Board key="board" />}
          {view === "calendar" && <CalendarView key="calendar" />}
          {view === "focus" && <FocusView key="focus" />}
          {view === "stats" && <StatsView key="stats" />}
        </AnimatePresence>
      </main>
      <CommandPalette />
    </div>
  );
}