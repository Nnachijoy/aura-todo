import { useState } from "react";
import { List, Kanban, Calendar, Focus, BarChart3, Settings, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import SettingsModal from "./SettingsModal";

const items = [
  { id: "list", label: "Tasks", icon: List },
  { id: "kanban", label: "Board", icon: Kanban },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "focus", label: "Focus", icon: Focus },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

function SidebarContent({ view, setView, onClose, onOpenSettings }) {
  return (
    <div className="w-64 h-full border-r border-white/5 p-6 flex flex-col bg-app lg:bg-transparent">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center font-bold text-white">
            A
          </div>
          <span className="font-semibold text-lg text-white">Aura</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="space-y-1 flex-1">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
              view === id
                ? "bg-white/5 text-white"
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      <button
        onClick={onOpenSettings}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition"
      >
        <Settings className="w-4 h-4" /> Settings
      </button>
    </div>
  );
}

export default function Sidebar({ view, setView, open, onClose }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex shrink-0">
        <SidebarContent
          view={view}
          setView={setView}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-50"
            >
              <SidebarContent
                view={view}
                setView={setView}
                onClose={onClose}
                onOpenSettings={() => {
                  setSettingsOpen(true);
                  onClose();
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}