import axios from "axios";

function getSessionId() {
  let id = localStorage.getItem("aura_session_id");
  if (!id) {
    id =
      "u_" +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2);
    localStorage.setItem("aura_session_id", id);
  }
  return id;
}

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

// Log every request and response for debugging
api.interceptors.request.use(
  (config) => {
    const sessionId = getSessionId();
    config.headers["X-Session-Id"] = sessionId;
    console.log(`[API] → ${config.method?.toUpperCase()} ${config.url}`, {
      sessionId,
      headers: config.headers,
    });
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`[API] ← ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error("[API] Response error:", {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

export default api;