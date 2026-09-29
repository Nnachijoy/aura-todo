import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../store/useStore";

export default function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useStore();

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setPaletteOpen]);

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-32"
          onClick={() => setPaletteOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[#141416] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <input
              autoFocus
              placeholder="Search or type a command..."
              className="w-full px-5 py-4 bg-transparent focus:outline-none text-lg text-white placeholder:text-white/30"
            />
            <div className="border-t border-white/5 p-2 text-sm text-white/40">
              <div className="px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer">
                → New task
              </div>
              <div className="px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer">
                → Toggle dark mode
              </div>
              <div className="px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer">
                → View stats
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}