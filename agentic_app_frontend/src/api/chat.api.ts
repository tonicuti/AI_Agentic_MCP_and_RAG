import type { LLMResponse } from "../types/chat";

const API_URL = import.meta.env.VITE_API_URL;

export async function sengMessageToLLM(message: string): Promise<LLMResponse> {
    console.log("API_URL", API_URL);
    const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
    });
    if (!response.ok) {
        let errorMessage = "Something went wrong";

        try {
            const errorData = await response.json();
            errorMessage = errorData?.error || errorData?.message || errorMessage;
        } catch {
            errorMessage = "Server error occured";
        }
        throw new Error(errorMessage);
    }
    return response.json() as Promise<LLMResponse>;
}