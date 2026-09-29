import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import api from "../lib/api";
import TaskItem from "./TaskItem";

export default function TaskList() {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks/").then((r) => r.data),
  });

  const reorder = useMutation({
    mutationFn: (items) => api.post("/tasks/reorder", items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const handleDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = tasks.findIndex((t) => t.id === active.id);
    const newIdx = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIdx, newIdx);
    qc.setQueryData(["tasks"], reordered);
    reorder.mutate(reordered.map((t, i) => ({ id: t.id, order: i })));
  };

  if (isLoading)
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-white/5 rounded-2xl animate-pulse"
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
        <div className="text-6xl mb-4">✨</div>
        <p className="text-xl font-medium text-white/70">
          Your mind is clear.
        </p>
        <p className="mt-1">Add your first task above.</p>
      </motion.div>
    );

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {tasks.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}