import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import clsx from "clsx";
import api from "../lib/api";

const COLUMNS = [
  { id: "todo", label: "To Do", color: "border-white/10" },
  { id: "doing", label: "Doing", color: "border-violet-500/30" },
  { id: "done", label: "Done", color: "border-emerald-500/30" },
];

export default function Board() {
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks/").then((r) => r.data),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/tasks/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  // Figure out which column each task belongs to
  const tasksByColumn = {
    todo: tasks.filter((t) => !t.completed && t.status !== "doing"),
    doing: tasks.filter((t) => !t.completed && t.status === "doing"),
    done: tasks.filter((t) => t.completed),
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("taskId"));
    if (!taskId) return;

    if (columnId === "done") {
      update.mutate({ id: taskId, patch: { completed: true, status: "todo" } });
    } else if (columnId === "doing") {
      update.mutate({ id: taskId, patch: { completed: false, status: "doing" } });
    } else {
      update.mutate({ id: taskId, patch: { completed: false, status: "todo" } });
    }
  };

  if (isLoading)
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-96 bg-white/5 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );

  if (!tasks.length)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-24 text-white/40"
      >
        <div className="text-6xl mb-4">📊</div>
        <p className="text-xl font-medium text-white/70">No tasks yet.</p>
        <p className="mt-1">Add some tasks to see them on the board.</p>
      </motion.div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, col.id)}
          className={clsx(
            "rounded-2xl border bg-white/[0.02] p-4 min-h-[400px] transition",
            col.color,
            "hover:bg-white/[0.04]"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
              {col.label}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/50">
              {tasksByColumn[col.id].length}
            </span>
          </div>

          <div className="space-y-2">
            {tasksByColumn[col.id].map((task) => (
              <BoardCard key={task.id} task={task} />
            ))}

            {tasksByColumn[col.id].length === 0 && (
              <div className="text-center py-8 text-xs text-white/30 border border-dashed border-white/10 rounded-xl">
                Drop tasks here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function BoardCard({ task }) {
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: () =>
      api.patch(`/tasks/${task.id}`, { completed: !task.completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const priorityColors = {
    low: "bg-blue-500/20 text-blue-300",
    medium: "bg-amber-500/20 text-amber-300",
    high: "bg-orange-500/20 text-orange-300",
    urgent: "bg-red-500/20 text-red-300",
  };

  return (
    <motion.div
      layout
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", String(task.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      whileHover={{ y: -2 }}
      className={clsx(
        "group bg-white/5 border border-white/5 rounded-xl p-3 cursor-grab active:cursor-grabbing transition",
        "hover:border-white/15 hover:bg-white/10"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle.mutate();
          }}
          className={clsx(
            "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition",
            task.completed
              ? "bg-violet-500 border-violet-500"
              : "border-white/20 hover:border-violet-400"
          )}
        >
          {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div
            className={clsx(
              "text-sm font-medium text-white leading-snug",
              task.completed && "line-through text-white/30"
            )}
          >
            {task.title}
          </div>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {task.priority && (
              <span
                className={clsx(
                  "px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wide",
                  priorityColors[task.priority]
                )}
              >
                {task.priority}
              </span>
            )}
            {task.tags && (
              <span className="text-[10px] text-white/40">{task.tags}</span>
            )}
          </div>

          {task.subtasks?.length > 0 && (
            <div className="text-[10px] text-white/40 mt-2">
              ✓ {task.subtasks.filter((s) => s.completed).length}/
              {task.subtasks.length} subtasks
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}