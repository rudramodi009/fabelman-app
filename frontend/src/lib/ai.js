import api from "../api/axios";

export const getAIRecommendation = async (prompt) => {
  try {
    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Invalid AI recommendation prompt.");
    }

    const response = await api.post("/api/ai/recommend", {
      prompt: prompt.trim(),
    });

    return response.data?.result ?? null;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(
        "AI recommendation error:",
        error.response?.data?.message || error.message,
      );
    }

    return null;
  }
};
