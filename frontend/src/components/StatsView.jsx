import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { CheckCircle2, ListChecks, Flame, TrendingUp, Target } from "lucide-react";
import api from "../lib/api";

const PRIORITY_COLORS = {
  urgent: "#EF4444",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#3B82F6",
};

const DAYS_BACK = 7;

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function shortDay(d) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export default function StatsView() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks/").then((r) => r.data),
  });

  // -------- Computed metrics --------
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const open = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Priority breakdown (open tasks)
    const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
    tasks.forEach((t) => {
      if (!t.completed && t.priority) priorityCounts[t.priority]++;
    });
    const priorityData = Object.entries(priorityCounts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: k, value: v, color: PRIORITY_COLORS[k] }));

    // Last 7 days — tasks completed per day
    const days = lastNDays(DAYS_BACK);
    const completionByDay = days.map((d) => {
      const key = dayKey(d);
      const count = tasks.filter((t) => {
        if (!t.completed_at) return false;
        return t.completed_at.slice(0, 10) === key;
      }).length;
      return { day: shortDay(d), count, date: key };
    });

    // Streak — consecutive days with ≥1 completion, ending today
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const hasCompletion = tasks.some(
        (t) => t.completed_at && t.completed_at.slice(0, 10) === key
      );
      if (hasCompletion) streak++;
      else if (i > 0) break; // allow today to be empty without breaking streak
      else continue;
    }

    // Focus sessions from localStorage
    const focusSessions = days.map((d) => {
      const key = d.toDateString();
      const count = Number(localStorage.getItem(`aura_focus_${key}`) || 0);
      return { day: shortDay(d), sessions: count };
    });
    const totalFocus = focusSessions.reduce((s, d) => s + d.sessions, 0);

    // Most productive day of the week
    const byWeekday = {};
    tasks.forEach((t) => {
      if (!t.completed_at) return;
      const wd = new Date(t.completed_at).toLocaleDateString(undefined, { weekday: "long" });
      byWeekday[wd] = (byWeekday[wd] || 0) + 1;
    });
    const topDay = Object.entries(byWeekday).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      completed,
      open,
      rate,
      priorityData,
      completionByDay,
      focusSessions,
      totalFocus,
      streak,
      topDay: topDay ? topDay[0] : "—",
    };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<ListChecks className="w-4 h-4" />}
          label="Total tasks"
          value={stats.total}
          accent="text-violet-300"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Completed"
          value={stats.completed}
          accent="text-emerald-300"
        />
        <StatCard
          icon={<Target className="w-4 h-4" />}
          label="Completion rate"
          value={`${stats.rate}%`}
          accent="text-amber-300"
        />
        <StatCard
          icon={<Flame className="w-4 h-4" />}
          label="Streak"
          value={`${stats.streak}d`}
          accent="text-orange-300"
        />
      </div>

      {/* Completion chart + Priority breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Last 7 days</h3>
              <p className="text-xs text-white/40 mt-0.5">Tasks completed per day</p>
            </div>
            <TrendingUp className="w-4 h-4 text-white/30" />
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.completionByDay} barCategoryGap={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={{
                    background: "#141416",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white">Priority breakdown</h3>
          <p className="text-xs text-white/40 mt-0.5 mb-4">Open tasks by priority</p>

          {stats.priorityData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs text-white/30">
              No open tasks yet
            </div>
          ) : (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.priorityData}
                      dataKey="value"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {stats.priorityData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#141416",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {stats.priorityData.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: p.color }}
                      />
                      <span className="text-white/60 capitalize">{p.name}</span>
                    </div>
                    <span className="text-white/80 tabular-nums">{p.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Focus sessions + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white">Focus sessions</h3>
          <p className="text-xs text-white/40 mt-0.5 mb-4">
            Pomodoro sessions completed · {stats.totalFocus} total this week
          </p>

          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.focusSessions} barCategoryGap={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={{
                    background: "#141416",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="sessions" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-4">Insights</h3>

          <div className="space-y-3 flex-1">
            <InsightRow
              label="Most productive day"
              value={stats.topDay}
            />
            <InsightRow
              label="Currently open"
              value={`${stats.open} ${stats.open === 1 ? "task" : "tasks"}`}
            />
            <InsightRow
              label="All-time completed"
              value={stats.completed}
            />
            <InsightRow
              label="Focus streak"
              value={`${stats.streak} ${stats.streak === 1 ? "day" : "days"}`}
            />
          </div>

          {/* Motivation line */}
          <div className="mt-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-200 leading-relaxed">
            {stats.rate >= 80
              ? "🔥 You're crushing it — over 80% completion rate!"
              : stats.rate >= 50
              ? "💪 Solid progress — keep the momentum going."
              : stats.total === 0
              ? "✨ Add your first task to see stats."
              : "🎯 Room to grow — try focusing on a few tasks at a time."}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 transition"
    >
      <div className={`flex items-center gap-2 ${accent}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-white mt-2 tabular-nums">
        {value}
      </div>
    </motion.div>
  );
}

function InsightRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-sm text-white/90 font-medium">{value}</span>
    </div>
  );
}