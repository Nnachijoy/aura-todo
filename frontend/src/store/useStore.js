import { create } from "zustand";

function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.remove("light");
  }
  localStorage.setItem("aura_theme", theme);
}

export const useStore = create((set, get) => ({
  theme: localStorage.getItem("aura_theme") || "dark",
  paletteOpen: false,
  setPaletteOpen: (v) => set({ paletteOpen: v }),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ theme: next });
  },
}));