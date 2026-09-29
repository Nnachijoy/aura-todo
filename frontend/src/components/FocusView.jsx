import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Check, Coffee, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import clsx from "clsx";
import api from "../lib/api";

const MODES = {
  work: { label: "Focus", minutes: 25, color: "#8B5CF6", emoji: "🎯" },
  short: { label: "Short Break", minutes: 5, color: "#10B981", emoji: "☕" },
  long: { label: "Long Break", minutes: 15, color: "#3B82F6", emoji: "🌊" },
};

export default function FocusView() {
  const qc = useQueryClient();
  const [mode, setMode] = useState("work");
  const [secondsLeft, setSecondsLeft] = useState(MODES.work.minutes * 60);
  const [running, setRunning] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [completedToday, setCompletedToday] = useState(0);
  const intervalRef = useRef(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks/").then((r) => r.data),
  });

  const openTasks = tasks.filter((t) => !t.completed);

  useEffect(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem(`aura_focus_${today}`);
    setCompletedToday(stored ? Number(stored) : 0);
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          handleComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const handleComplete = () => {
    setRunning(false);
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.6 },
      colors: ["#8B5CF6", "#10B981", "#3B82F6"],
    });
    if (mode === "work") {
      const today = new Date().toDateString();
      const newCount = completedToday + 1;
      setCompletedToday(newCount);
      localStorage.setItem(`aura_focus_${today}`, String(newCount));
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setSecondsLeft(MODES[newMode].minutes * 60);
    setRunning(false);
  };

  const toggle = () => {
    if (secondsLeft === 0) setSecondsLeft(MODES[mode].minutes * 60);
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(MODES[mode].minutes * 60);
  };

  const completeActiveTask = async () => {
    if (!activeTask) return;
    await api.patch(`/tasks/${activeTask.id}`, { completed: true });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    setActiveTask(null);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  };

  const totalSeconds = MODES[mode].minutes * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6"
    >
      {/* Main timer panel */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center min-h-[560px]">
        {/* Mode tabs */}
        <div className="flex items-center gap-1 sm:gap-2 mb-6 bg-white/5 rounded-2xl p-1">
          {Object.entries(MODES).map(([key, m]) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={clsx(
                "px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition whitespace-nowrap",
                mode === key
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white"
              )}
            >
              <span className="mr-1">{m.emoji}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Ring with controls inside */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r={radius} fill="none"
              stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <motion.circle
              cx="120" cy="120" r={radius} fill="none"
              stroke={MODES[mode].color} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl sm:text-6xl font-light tabular-nums text-white leading-none">
              {timeStr}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1.5">
              {MODES[mode].label}
            </div>

            {/* Controls inside the ring */}
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={reset}
                className="p-2.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={toggle}
                className={clsx(
                  "px-6 py-2.5 rounded-full text-white font-semibold text-sm transition flex items-center gap-1.5 shadow-lg",
                  running
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                    : "bg-violet-500 hover:bg-violet-600 shadow-violet-500/30"
                )}
              >
                {running ? (
                  <><Pause className="w-4 h-4" /> Pause</>
                ) : (
                  <><Play className="w-4 h-4" /> Start</>
                )}
              </button>

              <button
                onClick={() => switchMode(mode === "work" ? "short" : "work")}
                className="p-2.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition"
                title="Switch mode"
              >
                {mode === "work" ? <Coffee className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Session counter */}
        <div className="mt-4 text-center">
          <div className="text-2xl font-semibold text-white">{completedToday}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">
            {completedToday === 1 ? "session today" : "sessions today"}
          </div>
        </div>
      </div>

      {/* Task selector */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col">
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Working on
          </div>
          <div className="text-sm text-white/90">
            {activeTask ? activeTask.title : "Nothing selected yet"}
          </div>
        </div>

        {activeTask && (
          <button
            onClick={completeActiveTask}
            className="mb-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition text-sm font-medium"
          >
            <Check className="w-4 h-4" /> Mark as done
          </button>
        )}

        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
          Pick a task
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[400px]">
          {openTasks.length === 0 && (
            <div className="text-center py-8 text-xs text-white/30">
              No open tasks. Add some first.
            </div>
          )}
          {openTasks.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTask(t)}
              className={clsx(
                "w-full text-left px-3 py-2.5 rounded-xl text-sm transition flex items-center gap-2",
                activeTask?.id === t.id
                  ? "bg-violet-500/20 border border-violet-500/40 text-violet-200"
                  : "bg-white/5 border border-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
              <span className="flex-1 truncate">{t.title}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}