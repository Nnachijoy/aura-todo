import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import api from "../lib/api";

export default function AIBriefing() {
  const { data } = useQuery({
    queryKey: ["briefing"],
    queryFn: () => api.get("/ai/briefing").then((r) => r.data),
    staleTime: 1000 * 60 * 30,
  });

  if (!data?.briefing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-transparent flex gap-3"
    >
      <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
      <p className="text-sm text-white/80 leading-relaxed">{data.briefing}</p>
    </motion.div>
  );
}