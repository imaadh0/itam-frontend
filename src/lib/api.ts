import axios from "axios";

type ApiErrorResponse = {
  status?: string;
  message?: string;
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const token = window.localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== "undefined" &&
      axios.isAxiosError<ApiErrorResponse>(error) &&
      error.response?.status === 401
    ) {
      window.localStorage.removeItem("token");
      document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (
    axios.isAxiosError<ApiErrorResponse>(error) &&
    typeof error.response?.data?.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallbackMessage;
}

export default api;
