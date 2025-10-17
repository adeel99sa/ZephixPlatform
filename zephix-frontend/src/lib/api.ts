import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // Adjust token source to your auth flow (cookie/localStorage/context)
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize error shape so UI never sees raw Axios objects
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status ?? 0;
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Unexpected error";
    return Promise.reject({ status, message });
  }
);
