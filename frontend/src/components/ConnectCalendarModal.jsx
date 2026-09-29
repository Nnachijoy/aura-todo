import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, X, ExternalLink, Check } from "lucide-react";
import api from "../lib/api";

export default function ConnectCalendarModal({ open, onClose }) {
  const [step, setStep] = useState("intro");
  const [authUrl, setAuthUrl] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startConnect = async () => {
    try {
      const r = await api.get("/google/auth-url");
      setAuthUrl(r.data.url);
      setStep("code");
    } catch {
      setError("Couldn't start connection. Is the backend running?");
    }
  };

  const submitCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/google/exchange", { code: code.trim() });
      setStep("done");
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    } catch {
      setError("Code is invalid or expired. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    localStorage.setItem("aura_connect_dismissed", "1");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={skip}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#141416] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-violet-400" />
              </div>
              <button
                onClick={skip}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {step === "intro" && (
              <>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Want reminders?
                </h2>
                <p className="text-sm text-white/60 mb-6 leading-relaxed">
                  Connect your Google Calendar and every task with a due date
                  will automatically appear there — with email + phone
                  reminders from Google, for free.
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Syncs automatically
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Email + phone reminders
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Disconnect anytime
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={startConnect}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition"
                  >
                    Connect Calendar
                  </button>
                  <button
                    onClick={skip}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm transition"
                  >
                    Not now
                  </button>
                </div>
              </>
            )}

            {step === "code" && (
              <>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Authorize Aura
                </h2>

                <ol className="text-sm text-white/60 mb-4 space-y-2 list-decimal list-inside">
                  <li>Click the button below to open Google</li>
                  <li>Sign in and click <strong>Allow</strong></li>
                  <li>Copy the code Google shows you</li>
                  <li>Paste it below</li>
                </ol>

                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition mb-3"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Google Authorization
                </a>

                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste the code here..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40 mb-3"
                />

                {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

                <div className="flex gap-2">
                  <button
                    onClick={submitCode}
                    disabled={loading || !code.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition"
                  >
                    {loading ? "Connecting..." : "Connect"}
                  </button>
                  <button
                    onClick={skip}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm transition"
                  >
                    Later
                  </button>
                </div>
              </>
            )}

            {step === "done" && (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-1">
                  Connected!
                </h2>
                <p className="text-sm text-white/60">
                  Your tasks will now sync to Google Calendar.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}