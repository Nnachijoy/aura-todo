import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import clsx from "clsx";

const QUICK_TIMES = [
  { label: "9 AM", value: "09:00" },
  { label: "12 PM", value: "12:00" },
  { label: "3 PM", value: "15:00" },
  { label: "6 PM", value: "18:00" },
];

function friendlyDate(iso) {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${iso}T12:00:00`);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtTime12(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function WhenPicker({ date, startTime, endTime, onChange }) {
  const [open, setOpen] = useState(false);
  const dateRef = useRef(null);
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);

  const today = new Date();
  const tomorrow = addDays(today, 1);

  const quickDates = [
    { label: "Today", value: toISODate(today) },
    { label: "Tomorrow", value: toISODate(tomorrow) },
  ];

  const isSet = !!date || !!startTime;

  let label = "When?";
  if (date && startTime && endTime) {
    label = `${friendlyDate(date)} · ${fmtTime12(startTime)} – ${fmtTime12(endTime)}`;
  } else if (date && startTime) {
    label = `${friendlyDate(date)} · ${fmtTime12(startTime)}`;
  } else if (date) {
    label = friendlyDate(date);
  } else if (startTime) {
    label = fmtTime12(startTime);
  }

  const openNativeDate = () => {
    const el = dateRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try { el.showPicker(); return; } catch {}
    }
    el.focus();
    el.click();
  };

  const openNativeTime = (ref) => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try { el.showPicker(); return; } catch {}
    }
    el.focus();
    el.click();
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange("", "", "");
  };

  const handleQuickTime = (t) => {
    const newDate = date || toISODate(today);
    onChange(newDate, t, endTime);
  };

  const handleStartTimeChange = (t) => {
    const newDate = date || (t ? toISODate(today) : "");
    onChange(newDate, t, endTime);
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition whitespace-nowrap",
          isSet
            ? "text-violet-300 border-violet-400/30 bg-violet-500/10 hover:brightness-125"
            : "text-white/50 border-white/10 hover:text-white hover:bg-white/5"
        )}
      >
        {startTime ? <Clock className="w-3 h-3" /> : <CalendarIcon className="w-3 h-3" />}
        <span>{label}</span>
        {isSet && (
          <span
            onClick={clear}
            className="ml-0.5 -mr-0.5 p-0.5 rounded hover:bg-white/10 cursor-pointer"
            title="Clear"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-[22rem] max-h-[85vh] overflow-y-auto bg-[#141416] border border-white/10 rounded-2xl shadow-2xl"
            >
              <div className="p-5 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">When?</h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* DATE */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-2">
                    📅 Date
                  </label>

                  {/* Quick date buttons */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {quickDates.map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => onChange(q.value, startTime, endTime)}
                        className={clsx(
                          "py-2.5 rounded-xl text-sm font-medium transition border",
                          date === q.value
                            ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                            : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                        )}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom date */}
                  <div
                    onClick={openNativeDate}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm cursor-pointer transition",
                      date && !quickDates.some((q) => q.value === date)
                        ? "text-violet-300 border-violet-400/30 bg-violet-500/10"
                        : "text-white/50 border-white/10 hover:bg-white/5"
                    )}
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span className="flex-1">
                      {date && !quickDates.some((q) => q.value === date)
                        ? friendlyDate(date)
                        : "Pick another date"}
                    </span>
                  </div>
                  <input
                    ref={dateRef}
                    type="date"
                    value={date || ""}
                    onChange={(e) => onChange(e.target.value, startTime, endTime)}
                    className="absolute opacity-0 pointer-events-none w-0 h-0"
                    tabIndex={-1}
                  />
                </div>

                {/* TIME */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-2">
                    🕐 Time <span className="text-white/25 normal-case">(optional)</span>
                  </label>

                  {/* Quick chips */}
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {QUICK_TIMES.map((qt) => (
                      <button
                        key={qt.value}
                        type="button"
                        onClick={() => handleQuickTime(qt.value)}
                        className={clsx(
                          "py-2 rounded-xl text-xs font-medium transition border",
                          startTime === qt.value
                            ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {qt.label}
                      </button>
                    ))}
                  </div>

                  {/* Manual start / end — WHOLE pill is clickable */}
                  <div className="flex items-center gap-2">
                    {/* Start time pill */}
                    <button
                      type="button"
                      onClick={() => openNativeTime(startTimeRef)}
                      className={clsx(
                        "flex items-center gap-1.5 flex-1 px-3 py-2.5 rounded-xl border text-xs transition cursor-pointer text-left",
                        startTime
                          ? "text-violet-300 border-violet-400/30 bg-violet-500/10 hover:brightness-110"
                          : "text-white/50 border-white/10 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1">
                        {startTime ? fmtTime12(startTime) : "Start time"}
                      </span>
                    </button>

                    <span className="text-white/30 text-xs">to</span>

                    {/* End time pill */}
                    <button
                      type="button"
                      onClick={() => openNativeTime(endTimeRef)}
                      className={clsx(
                        "flex items-center gap-1.5 flex-1 px-3 py-2.5 rounded-xl border text-xs transition cursor-pointer text-left",
                        endTime
                          ? "text-violet-300 border-violet-400/30 bg-violet-500/10 hover:brightness-110"
                          : "text-white/50 border-white/10 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1">
                        {endTime ? fmtTime12(endTime) : "End time"}
                      </span>
                    </button>

                    {/* Hidden native time inputs */}
                    <input
                      ref={startTimeRef}
                      type="time"
                      value={startTime || ""}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="absolute opacity-0 pointer-events-none w-0 h-0"
                      tabIndex={-1}
                    />
                    <input
                      ref={endTimeRef}
                      type="time"
                      value={endTime || ""}
                      onChange={(e) => onChange(date, startTime, e.target.value)}
                      className="absolute opacity-0 pointer-events-none w-0 h-0"
                      tabIndex={-1}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { onChange("", "", ""); setOpen(false); }}
                    className="px-4 py-2.5 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/5 transition"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-500 hover:bg-violet-600 text-white transition flex items-center justify-center gap-2"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}