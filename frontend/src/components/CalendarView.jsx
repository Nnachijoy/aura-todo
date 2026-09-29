import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X, Check } from "lucide-react";
import clsx from "clsx";
import api from "../lib/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year, month) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarView() {
  const today = new Date();
  const [current, setCurrent] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selected, setSelected] = useState(today);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks/").then((r) => r.data),
  });

  // Map tasks to their due date's day key
  const tasksByDate = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      if (!t.due_date) continue;
      const d = new Date(t.due_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [tasks]);

  const daysInMonth = getDaysInMonth(current.year, current.month);
  const firstWeekday = getFirstWeekday(current.year, current.month);

  const cells = [];
  // Empty cells before the 1st
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(null);
  }
  // Real days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(current.year, current.month, d));
  }

  const prevMonth = () => {
    setCurrent((c) =>
      c.month === 0
        ? { year: c.year - 1, month: 11 }
        : { year: c.year, month: c.month - 1 }
    );
  };

  const nextMonth = () => {
    setCurrent((c) =>
      c.month === 11
        ? { year: c.year + 1, month: 0 }
        : { year: c.year, month: c.month + 1 }
    );
  };

  const goToday = () => {
    const t = new Date();
    setCurrent({ year: t.getFullYear(), month: t.getMonth() });
    setSelected(t);
  };

  const selectedKey = `${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}`;
  const selectedTasks = tasksByDate[selectedKey] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6"
    >
      {/* Calendar */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">
              {MONTHS[current.month]} {current.year}
            </h2>
            <button
              onClick={goToday}
              className="text-xs px-2.5 py-1 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs uppercase tracking-wider text-white/30 py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date)
              return <div key={`empty-${i}`} className="aspect-square" />;

            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            const dayTasks = tasksByDate[key] || [];
            const isToday = isSameDay(date, today);
            const isSelected = isSameDay(date, selected);
            const hasTasks = dayTasks.length > 0;

            return (
              <button
                key={key}
                onClick={() => setSelected(date)}
                className={clsx(
                  "aspect-square rounded-xl p-1.5 text-left relative transition flex flex-col",
                  isSelected
                    ? "bg-violet-500/20 border border-violet-500/40"
                    : "hover:bg-white/5 border border-transparent",
                  !isSelected && isToday && "border-white/20"
                )}
              >
                <span
                  className={clsx(
                    "text-xs font-medium",
                    isToday ? "text-violet-300" : "text-white/60"
                  )}
                >
                  {date.getDate()}
                </span>

                {hasTasks && (
                  <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className={clsx(
                          "text-[9px] truncate rounded px-1 py-0.5",
                          t.completed
                            ? "bg-white/5 text-white/30 line-through"
                            : "bg-violet-500/20 text-violet-200"
                        )}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[9px] text-white/40 px-1">
                        +{dayTasks.length - 2} more
                      </div>
                    )}
                  </div>
                )}

                {hasTasks && !isSelected && (
                  <span className="absolute bottom-1 right-1.5 w-1 h-1 rounded-full bg-violet-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wider text-white/40">
            {WEEKDAYS[selected.getDay()]}
          </div>
          <div className="text-2xl font-semibold text-white mt-0.5">
            {selected.getDate()} {MONTHS[selected.getMonth()].slice(0, 3)}
          </div>
        </div>

        <AddTaskInline date={selected} />

        <div className="mt-4 space-y-2 flex-1 overflow-y-auto">
          {selectedTasks.length === 0 && (
            <div className="text-center py-12 text-white/30 text-sm">
              Nothing scheduled.
            </div>
          )}
          <AnimatePresence>
            {selectedTasks.map((t) => (
              <DayTaskRow key={t.id} task={t} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function AddTaskInline({ date }) {
  const [text, setText] = useState("");
  const qc = useQueryClient();

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    // Set the task's due_date to noon of the selected day
    const due = new Date(date);
    due.setHours(12, 0, 0, 0);

    await api.post("/tasks/", {
      title: text,
      due_date: due.toISOString(),
    });
    setText("");
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <form onSubmit={submit} className="relative">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add task for this day..."
        className="w-full pl-9 pr-9 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
      />
      <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 transition"
      >
        <Plus className="w-3 h-3 text-white" />
      </button>
    </form>
  );
}

function DayTaskRow({ task }) {
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: () =>
      api.patch(`/tasks/${task.id}`, { completed: !task.completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/tasks/${task.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="group flex items-start gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition"
    >
      <button
        onClick={() => toggle.mutate()}
        className={clsx(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition",
          task.completed
            ? "bg-violet-500 border-violet-500"
            : "border-white/20 hover:border-violet-400"
        )}
      >
        {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
      </button>
      <span
        className={clsx(
          "flex-1 text-sm text-white/90",
          task.completed && "line-through text-white/30"
        )}
      >
        {task.title}
      </span>
      <button
        onClick={() => remove.mutate()}
        className="p-1 rounded opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/10 transition"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}