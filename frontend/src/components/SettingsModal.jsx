import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Bell, Palette, Link2, Database, LogOut,
  Check, Download, Trash2, ExternalLink, AlertTriangle
} from "lucide-react";
import clsx from "clsx";
import api from "../lib/api";
import { useStore } from "../store/useStore";

const SECTIONS = [
  { id: "account", label: "Account", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "data", label: "Data", icon: Database },
];

export default function SettingsModal({ open, onClose }) {
  const [section, setSection] = useState("account");
  const qc = useQueryClient();

  const { data: googleStatus } = useQuery({
    queryKey: ["google-status"],
    queryFn: () => api.get("/google/status").then((r) => r.data),
    enabled: open,
  });

  const [notifEnabled, setNotifEnabled] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") {
      alert("Your browser doesn't support notifications.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotifEnabled(true);
      new Notification("Aura", { body: "Notifications enabled 🎉" });
    }
  };

  const disconnectGoogle = async () => {
    if (!confirm("Disconnect Google Calendar? Your tasks will stop syncing.")) return;
    await api.post("/google/disconnect");
    qc.invalidateQueries({ queryKey: ["google-status"] });
  };

  const exportTasks = async () => {
    const tasks = await api.get("/tasks/").then((r) => r.data);
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-tasks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllTasks = async () => {
    if (!confirm("Delete ALL tasks permanently? This cannot be undone.")) return;
    const tasks = await api.get("/tasks/").then((r) => r.data);
    for (const t of tasks) {
      await api.delete(`/tasks/${t.id}`);
    }
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const signOut = () => {
    if (!confirm("Sign out? This clears your session — your tasks stay on the server for this browser.")) return;
    localStorage.removeItem("aura_session_id");
    localStorage.removeItem("aura_connect_dismissed");
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-2xl h-[min(600px,85vh)] bg-[#141416] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="text-base font-semibold text-white">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Left nav */}
              <div className="w-44 shrink-0 border-r border-white/5 p-2 hidden sm:block">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setSection(id)}
                    className={clsx(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition mb-0.5",
                      section === id
                        ? "bg-white/5 text-white"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Mobile nav (horizontal) */}
              <div className="sm:hidden absolute top-14 left-0 right-0 px-2 flex gap-1 overflow-x-auto border-b border-white/5 bg-[#141416] z-10 pb-2">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setSection(id)}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition",
                      section === id
                        ? "bg-white/5 text-white"
                        : "text-white/50"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 pt-16 sm:pt-6">
                {section === "account" && (
                  <AccountSection googleStatus={googleStatus} />
                )}
                {section === "notifications" && (
                  <NotificationsSection
                    enabled={notifEnabled}
                    onEnable={requestNotifications}
                  />
                )}
                {section === "appearance" && <AppearanceSection />}
                {section === "integrations" && (
                  <IntegrationsSection
                    googleStatus={googleStatus}
                    onDisconnect={disconnectGoogle}
                  />
                )}
                {section === "data" && (
                  <DataSection
                    onExport={exportTasks}
                    onClear={clearAllTasks}
                    onSignOut={signOut}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------- Sections ---------- */

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-white/50 mt-1">{subtitle}</p>}
    </div>
  );
}

function Row({ label, value, children, danger }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="min-w-0 flex-1 pr-3">
        <div className={clsx("text-sm", danger ? "text-red-400" : "text-white/90")}>
          {label}
        </div>
        {value && <div className="text-xs text-white/40 mt-0.5 truncate">{value}</div>}
      </div>
      {children}
    </div>
  );
}

function AccountSection({ googleStatus }) {
  const sessionId = localStorage.getItem("aura_session_id") || "not set";
  return (
    <>
      <SectionHeader
        title="Account"
        subtitle="You're signed in with a browser session — no password needed."
      />
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
        <Row label="Session ID" value={sessionId.slice(0, 20) + "..."}>
          <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
            Active
          </span>
        </Row>
        <Row
          label="Google account"
          value={googleStatus?.email || "Not connected"}
        >
          <span
            className={clsx(
              "text-[10px] uppercase tracking-wide px-2 py-1 rounded-full",
              googleStatus?.connected
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-white/5 text-white/40"
            )}
          >
            {googleStatus?.connected ? "Connected" : "Off"}
          </span>
        </Row>
      </div>
    </>
  );
}

function NotificationsSection({ enabled, onEnable }) {
  return (
    <>
      <SectionHeader
        title="Notifications"
        subtitle="Get reminders when tasks are due."
      />
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
        <Row
          label="Browser notifications"
          value={enabled ? "Enabled — you'll see popups" : "Off — click to enable"}
        >
          {!enabled ? (
            <button
              onClick={onEnable}
              className="px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-xs font-medium text-white transition"
            >
              Enable
            </button>
          ) : (
            <Check className="w-4 h-4 text-emerald-400" />
          )}
        </Row>
        <Row
          label="Email reminders"
          value="Coming soon — Google Calendar already sends them for you"
        >
          <span className="text-[10px] uppercase tracking-wide text-white/30">
            Soon
          </span>
        </Row>
      </div>
    </>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useStore();
  return (
    <>
      <SectionHeader title="Appearance" subtitle="Customize how Aura looks." />
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
        <div className="text-sm text-white/90 mb-3">Theme</div>
        <div className="grid grid-cols-2 gap-2">
          {["dark", "light"].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={clsx(
                "px-4 py-3 rounded-xl border text-sm font-medium transition capitalize",
                theme === t
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function IntegrationsSection({ googleStatus, onDisconnect }) {
  return (
    <>
      <SectionHeader
        title="Integrations"
        subtitle="Connect Aura to the tools you already use."
      />
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
        <Row
          label="Google Calendar"
          value={
            googleStatus?.connected
              ? `Connected as ${googleStatus.email}`
              : "Sync tasks with dates to your calendar"
          }
        >
          {googleStatus?.connected ? (
            <button
              onClick={onDisconnect}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-xs font-medium text-red-300 transition"
            >
              Disconnect
            </button>
          ) : (
            <a
              href="http://127.0.0.1:8000/google/auth-url"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-xs font-medium text-white transition inline-flex items-center gap-1"
            >
              Connect <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </Row>
      </div>
    </>
  );
}

function DataSection({ onExport, onClear, onSignOut }) {
  return (
    <>
      <SectionHeader
        title="Data & Privacy"
        subtitle="Your tasks are stored on this device's backend."
      />
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-4">
        <Row
          label="Export tasks"
          value="Download all tasks as JSON"
        >
          <button
            onClick={onExport}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium text-white transition inline-flex items-center gap-1"
          >
            <Download className="w-3 h-3" /> Export
          </button>
        </Row>

        <Row
          label="Delete all tasks"
          value="Removes everything. Cannot be undone."
          danger
        >
          <button
            onClick={onClear}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-xs font-medium text-red-300 transition inline-flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </Row>
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm text-white/90">Sign out</div>
            <div className="text-xs text-white/50 mt-0.5 mb-3">
              Clears your session. You'll get a fresh identity — tasks in this
              session won't be accessible again.
            </div>
            <button
              onClick={onSignOut}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-medium text-white transition inline-flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}