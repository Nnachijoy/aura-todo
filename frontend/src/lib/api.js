import axios from "axios";

// Get or create a persistent session ID for this browser
function getSessionId() {
  let id = localStorage.getItem("aura_session_id");
  if (!id) {
    // Generate a random session id
    id =
      "u_" +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2);
    localStorage.setItem("aura_session_id", id);
  }
  return id;
}

const api = axios.create({
  baseURL: "http://localhost:8000",
});

// Attach session id to every request
api.interceptors.request.use((config) => {
  config.headers["X-Session-Id"] = getSessionId();
  return config;
});

export default api;