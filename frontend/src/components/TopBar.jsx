import { useState } from "react";
import { Sparkles, ChevronDown, Plus, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import clsx from "clsx";
import api from "../lib/api";
import WhenPicker from "./WhenPicker";
import ConnectCalendarModal from "./ConnectCalendarModal";

const PRIORITIES = [
  { value: "low", label: "Low", color: "text-blue-300 border-blue-400/30 bg-blue-500/10" },
  { value: "medium", label: "Medium", color: "text-amber-300 border-amber-400/30 bg-amber-500/10" },
  { value: "high", label: "High", color: "text-orange-300 border-orange-400/30 bg-orange-500/10" },
  { value: "urgent", label: "Urgent", color: "text-red-300 border-red-400/30 bg-red-500/10" },
];

export default function TopBar() {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();

  const selected = PRIORITIES.find((p) => p.value === priority);

  const buildISO = (dateStr, timeStr) => {
    if (!dateStr && !timeStr) return null;
    const d = new Date(`${dateStr || new Date().toISOString().slice(0, 10)}T00:00:00`);
    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d.toISOString();
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["briefing"] });
  };

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || submitting) return;

    setError("");
    setSubmitting(true);

    const dueISO = buildISO(dueDate, startTime);
    const endISO = endTime ? buildISO(dueDate, endTime) : null;
    const payloadPriority = priority || "medium";
    const rawTitle = text.trim();

    // Clear input immediately for responsiveness
    setText("");
    setPriority("");
    setDueDate("");
    setStartTime("");
    setEndTime("");

    // Add optimistic task locally so it appears instantly
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = {
      id: tempId,
      title: rawTitle,
      notes: "",
      completed: false,
      status: "todo",
      priority: payloadPriority,
      tags: "",
      due_date: dueISO,
      due_end: endISO,
      order: 9999,
      created_at: new Date().toISOString(),
      completed_at: null,
      subtasks: [],
    };

    const previous = qc.getQueryData(["tasks"]) || [];
    qc.setQueryData(["tasks"], [...previous, optimisticTask]);

    // Try to create the task — with a longer timeout for cold-start backend
    try {
      let parsed = { title: rawTitle };
      try {
        const p = await api.post("/ai/parse", { text: rawTitle }, { timeout: 60000 });
        parsed = p.data;
      } catch {
        parsed = { title: rawTitle };
      }

      const response = await api.post(
        "/tasks/",
        {
          ...parsed,
          title: parsed.title || rawTitle,
          priority: payloadPriority,
          due_date: dueISO || parsed.due_date,
          due_end: endISO,
        },
        { timeout: 60000 }
      );

      // Replace the temporary task with the real one
      qc.setQueryData(["tasks"], (old = []) =>
        old.map((t) => (t.id === tempId ? response.data : t))
      );

      refresh();

      if (dueISO) {
        try {
          const statusRes = await api.get("/google/status");
          const alreadyDismissed = localStorage.getItem("aura_connect_dismissed");
          if (!statusRes.data.connected && !alreadyDismissed) {
            setShowConnectModal(true);
          }
        } catch (err) {
          // silent
        }
      }
    } catch (err) {
      // Roll back on failure
      qc.setQueryData(["tasks"], previous);
      const msg = err?.response?.data?.detail || err?.message || "Failed to add task";
      setError(typeof msg === "string" ? msg : "Failed to add task");
      console.error("Add task failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  };

  return (
    <>
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 sm:mb-8 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl p-2 flex flex-col sm:flex-row sm:items-center gap-2 focus-within:ring-2 focus-within:ring-violet-500/50 transition"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="ml-1 sm:ml-2 w-5 h-5 text-violet-400 shrink-0" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a task..."
            disabled={submitting}
            className="flex-1 min-w-0 bg-transparent focus:outline-none text-base placeholder:text-[var(--text-dim)] text-app py-2 disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <WhenPicker
            date={dueDate}
            startTime={startTime}
            endTime={endTime}
            onChange={(d, s, e) => {
              setDueDate(d);
              setStartTime(s);
              setEndTime(e);
            }}
          />

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setPriorityOpen((v) => !v)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition hover:brightness-125 whitespace-nowrap",
                selected
                  ? `${selected.color} uppercase tracking-wide`
                  : "text-app border-[var(--border)] hover:bg-[var(--hover)]"
              )}
            >
              {selected ? selected.label : "Set priority"}
              <ChevronDown className="w-3 h-3" />
            </button>

            {priorityOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPriorityOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden min-w-[130px]">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => { setPriority(p.value); setPriorityOpen(false); }}
                      className={clsx(
                        "w-full text-left px-3 py-2 text-xs uppercase tracking-wide transition hover:bg-[var(--hover)]",
                        p.value === priority ? p.color : "text-muted"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex-1 sm:flex-initial px-5 py-3 sm:py-2 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-50 transition text-white text-sm font-semibold shrink-0 flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <span className="animate-pulse">Adding...</span>
            ) : (
              <>
                <Plus className="w-4 h-4 sm:hidden" />
                Add
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="w-full flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </motion.form>

      <ConnectCalendarModal
        open={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
    </>
  );
}