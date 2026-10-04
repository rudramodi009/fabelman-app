import { create } from "zustand";
import api from "../api/axios";

const getErrorMessage = (error, fallback) => {
  return error.response?.data?.message || fallback;
};

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: false,
  fetchingUser: true,
  error: null,
  message: null,

  signup: async (username, email, password, accessPasskey) => {
    set({
      isLoading: true,
      error: null,
      message: null,
    });

    try {
      const response = await api.post("/api/signup", {
        username,
        email,
        password,
        accessPasskey,
      });

      set({
        user: response.data.user,
        isLoading: false,
        error: null,
      });

      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, "Error signing up");

      set({
        isLoading: false,
        error: message,
      });

      throw error;
    }
  },

  login: async (username, password) => {
    set({
      isLoading: true,
      error: null,
      message: null,
    });

    try {
      const response = await api.post("/api/login", {
        username,
        password,
      });

      const { user, message } = response.data;

      set({
        user,
        message,
        isLoading: false,
        error: null,
      });

      return { user, message };
    } catch (error) {
      const message = getErrorMessage(error, "Error signing in");

      set({
        isLoading: false,
        error: message,
      });

      throw error;
    }
  },

  fetchUser: async () => {
    set({
      fetchingUser: true,
      error: null,
    });

    try {
      const response = await api.get("/api/fetch-user");

      set({
        user: response.data.user,
        fetchingUser: false,
        error: null,
      });
    } catch (error) {
      set({
        user: null,
        fetchingUser: false,
      });

      if (error.response?.status !== 401) {
        set({
          error: getErrorMessage(error, "Error fetching user"),
        });
      }
    }
  },

  logout: async () => {
    set({
      isLoading: true,
      error: null,
      message: null,
    });

    try {
      const response = await api.post("/api/logout");
      const { message } = response.data;

      set({
        user: null,
        isLoading: false,
        error: null,
        message,
      });

      return { message };
    } catch (error) {
      const message = getErrorMessage(error, "Error logging out");

      set({
        isLoading: false,
        error: message,
      });

      throw error;
    }
  },
}));
