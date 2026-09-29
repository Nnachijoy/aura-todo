import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Check, Trash2, Sparkles, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import confetti from "canvas-confetti";
import clsx from "clsx";
import api from "../lib/api";

const PRIORITIES = ["low", "medium", "high", "urgent"];

const priorityColors = {
  low: "bg-blue-500/20 text-blue-300",
  medium: "bg-amber-500/20 text-amber-300",
  high: "bg-orange-500/20 text-orange-300",
  urgent: "bg-red-500/20 text-red-300",
};

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function to24Hour(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function friendlyWhen(task) {
  if (!task.due_date) return null;
  const d = new Date(task.due_date);
  const h = d.getHours();
  const isAllDay = h <= 1 || h >= 23;
  const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (isAllDay) return dateStr;
  return `${dateStr} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function TaskItem({ task }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingWhen, setEditingWhen] = useState(false);
  const [title, setTitle] = useState(task.title);

  const [tempDate, setTempDate] = useState("");
  const [tempTime, setTempTime] = useState("");

  const inputRef = useRef(null);
  const dateRef = useRef(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["briefing"] });
  };

  const update = useMutation({
    mutationFn: (patch) => api.patch(`/tasks/${task.id}`, patch),
    onSuccess: () => refresh(),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/tasks/${task.id}`),
    onSuccess: () => refresh(),
  });

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const startEdit = () => {
    setTitle(task.title);
    setEditing(true);
  };

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      update.mutate({ title: trimmed });
    } else {
      setTitle(task.title);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setTitle(task.title);
    setEditing(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const toggle = () => {
    if (!task.completed) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#8B5CF6", "#10B981", "#F59E0B"],
      });
    }
    update.mutate({ completed: !task.completed });
  };

  const breakdown = async () => {
    try {
      const r = await api.post("/ai/breakdown", { title: task.title });
      for (const st of r.data.subtasks) {
        await api.post(`/tasks/${task.id}/subtasks`, {
          title: st,
          completed: false,
        });
      }
      refresh();
      setExpanded(true);
    } catch (err) {
      console.error(err);
    }
  };

  const openWhenEditor = (e) => {
    e.stopPropagation();
    if (task.due_date) {
      setTempDate(toISODate(new Date(task.due_date)));
      setTempTime(to24Hour(task.due_date));
    } else {
      setTempDate("");
      setTempTime("");
    }
    setEditingWhen(true);
  };

  const saveWhen = () => {
    let dueISO = null;
    if (tempDate) {
      const d = new Date(`${tempDate}T00:00:00`);
      if (tempTime) {
        const [h, m] = tempTime.split(":").map(Number);
        d.setHours(h, m, 0, 0);
      }
      dueISO = d.toISOString();
    }
    update.mutate({ due_date: dueISO, due_end: null });
    setEditingWhen(false);
  };

  const clearWhen = () => {
    update.mutate({ due_date: null, due_end: null });
    setEditingWhen(false);
  };

  const openNativeDate = () => {
    const el = dateRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try { el.showPicker(); return; } catch {}
    }
    el.focus();
    el.click();
  };

  const whenLabel = friendlyWhen(task);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={clsx(
        "group bg-white/5 backdrop-blur border border-white/5 rounded-2xl p-3 sm:p-4 transition-all",
        "hover:border-white/10 hover:bg-white/10",
        isDragging && "opacity-50 shadow-2xl ring-2 ring-violet-500"
      )}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <button
          {...attributes}
          {...listeners}
          className="hidden sm:block cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-100 transition text-white mt-1"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <button
          onClick={toggle}
          className={clsx(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
            task.completed
              ? "bg-violet-500 border-violet-500 scale-95"
              : "border-white/20 hover:border-violet-400"
          )}
        >
          {task.completed && <Check className="w-3.5 h-3.5 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={saveTitle}
              className="w-full bg-transparent border-b border-violet-500/50 focus:border-violet-500 outline-none text-white font-medium py-0.5"
            />
          ) : (
            <div
              onClick={startEdit}
              className={clsx(
                "font-medium transition text-white cursor-text rounded px-1 -mx-1 hover:bg-white/5 break-words text-sm sm:text-base",
                task.completed && "line-through text-white/30"
              )}
              title="Click to edit"
            >
              {task.title}
            </div>
          )}

          {/* Meta row — priority + when chip */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <select
              value={task.priority || "medium"}
              onChange={(e) => update.mutate({ priority: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide border-0 outline-none cursor-pointer appearance-none",
                priorityColors[task.priority || "medium"]
              )}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p} className="bg-[#141416] text-white">
                  {p}
                </option>
              ))}
            </select>

            {/* When chip — compact */}
            {!editingWhen && (
              <button
                onClick={openWhenEditor}
                className={clsx(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full transition text-[10px]",
                  task.due_date
                    ? "bg-violet-500/10 border border-violet-400/30 text-violet-300 hover:brightness-125"
                    : "border border-white/10 text-white/40 hover:text-white hover:bg-white/5"
                )}
                title={task.due_date ? "Edit date" : "Set a date"}
              >
                <CalendarIcon className="w-2.5 h-2.5" />
                {whenLabel || "Set date"}
              </button>
            )}
          </div>

          {/* Inline date editor — only shows when tapped */}
          {editingWhen && (
            <div
              className="mt-2 p-3 rounded-xl bg-violet-500/10 border border-violet-400/30 space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[10px] uppercase tracking-wider text-violet-300 w-full sm:w-auto">
                  Date
                </label>
                <input
                  ref={dateRef}
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="bg-transparent border border-violet-400/30 rounded-lg px-2 py-1 outline-none text-xs text-white [color-scheme:dark] cursor-pointer flex-1 min-w-0"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[10px] uppercase tracking-wider text-violet-300 w-full sm:w-auto">
                  Time
                </label>
                <input
                  type="time"
                  value={tempTime}
                  onChange={(e) => setTempTime(e.target.value)}
                  className="bg-transparent border border-violet-400/30 rounded-lg px-2 py-1 outline-none text-xs text-white [color-scheme:dark] cursor-pointer flex-1 min-w-0"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={saveWhen}
                  className="px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={clearWhen}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white text-xs"
                >
                  Clear
                </button>
                <button
                  onClick={() => setEditingWhen(false)}
                  className="ml-auto px-3 py-1.5 rounded-lg text-white/40 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
          <button
            onClick={breakdown}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-white/5"
            title="AI breakdown"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-white/5 text-white"
          >
            <ChevronDown
              className={clsx("w-3.5 h-3.5 sm:w-4 sm:h-4 transition", expanded && "rotate-180")}
            />
          </button>
          <button
            onClick={() => remove.mutate()}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-red-500/10 text-red-400"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-white/5">
              <textarea
                defaultValue={task.notes}
                onBlur={(e) => update.mutate({ notes: e.target.value })}
                placeholder="Add notes..."
                className="w-full bg-transparent resize-none focus:outline-none text-sm text-white/70 placeholder:text-white/20 min-h-[60px]"
              />
              {task.subtasks?.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {task.subtasks.map((s) => (
                    <SubtaskRow key={s.id} subtask={s} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SubtaskRow({ subtask }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: () =>
      api.patch(`/tasks/subtasks/${subtask.id}`, {
        title: subtask.title,
        completed: !subtask.completed,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={() => toggle.mutate()}
        className={clsx(
          "w-4 h-4 rounded border flex items-center justify-center transition",
          subtask.completed
            ? "bg-violet-500 border-violet-500"
            : "border-white/20"
        )}
      >
        {subtask.completed && <Check className="w-2.5 h-2.5 text-white" />}
      </button>
      <span
        className={clsx(
          "text-white/80",
          subtask.completed && "line-through text-white/30"
        )}
      >
        {subtask.title}
      </span>
    </div>
  );
}