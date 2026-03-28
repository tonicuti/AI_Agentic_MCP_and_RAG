import { GoogleGenAI, mcpToTool } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client";

class GeminiRequestError extends Error {
    statusCode: number;
    userMessage: string;

    constructor(message: string, statusCode: number, userMessage: string) {
        super(message);
        this.name = "GeminiRequestError";
        this.statusCode = statusCode;
        this.userMessage = userMessage;
    }
}

class GeminiService {
    private static instance: GeminiService;
    private readonly modelName: string;
    private readonly genAI: GoogleGenAI;

    constructor(
        modelName: string = process.env.GEMINI_MODEL!
    ) {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("Missing Gemini API Key");
        }

        if (!modelName) {
            throw new Error("Missing Gemini Model Name");
        }

        this.genAI = new GoogleGenAI({ apiKey });
        this.modelName = modelName;
    }

    static getInstance(modelName?: string) {
        if (!GeminiService.instance) {
            GeminiService.instance = new GeminiService(modelName);
        }
        return GeminiService.instance;
    }

    private normalizeGeminiError(error: any): GeminiRequestError {
        const statusCode = Number(error?.status) || 500;
        const rawMessage = typeof error?.message === "string"
            ? error.message
            : "Unknown Gemini API error";

        if (statusCode === 429 || rawMessage.includes('"status":"RESOURCE_EXHAUSTED"')) {
            const lowerMessage = rawMessage.toLowerCase();
            const isQuotaExceeded = lowerMessage.includes("quota exceeded");
            const userMessage = isQuotaExceeded
                ? "Gemini API quota has been exceeded for the current plan. Please wait for the quota to reset or switch to another API key/model."
                : "Gemini API is rate limited right now. Please wait a few seconds and try again.";

            return new GeminiRequestError(rawMessage, 429, userMessage);
        }

        return new GeminiRequestError(
            rawMessage,
            statusCode,
            "Gemini could not generate a response right now. Please try again later."
        );
    }

    async generateResponse(prompt: string) {
        try {
            const response = await this.genAI.models.generateContent({
                model: this.modelName,
                contents: prompt,
            });

            return response.text || "No response generated";
        }
        catch (error: any) {
            console.error("Error generating response from Gemini:", error);
            throw this.normalizeGeminiError(error);
        }
    }

    async generateResponseWithTools(prompt: string, mcpClient: Client) {
        try {
            // 1. Khởi tạo mảng lịch sử trò chuyện
            const contents: any[] = [{
                role: 'user',
                parts: [{ text: prompt }]
            }];

            const config = {
                systemInstruction: {
                    role: 'model',
                    parts: [{
                        text: `
                            You are an AI assistant with access to internal tools.

                            TOOLS:
                            - RAG Search tool for knowledge-base, company information, policies, product details, and stored documents.
                            - Other internal tools provided to you.

                            BEHAVIOR RULES:
                            1. When a question is clearly related to stored documents, company information, product details, order/refund/shipping/support topics, or any knowledge-base content, try using the RAG Search tool first.
                            2. If the RAG tool returns no useful information, or the query is unrelated to stored documents, answer using your own general knowledge.
                            3. Use other tools only when they are clearly relevant to the user’s question.
                            4. If no tool is relevant, answer directly using your own reasoning.
                            5. Do not mention tool usage unless the user specifically asks.
                            6. Keep responses concise, accurate, and helpful.

                            Your goal is to provide the best possible answer, combining tools with your own knowledge when needed.

                        `
                    }]
                },
                tools: [
                    mcpToTool(mcpClient)
                ],
                temperature: 0.2
            };

            // 2. Lần gọi 1: Gửi câu hỏi và danh sách Tools cho Gemini
            const response1 = await this.genAI.models.generateContent({
                model: this.modelName,
                contents: contents,
                config: config,
            });

            // 3. Nếu Gemini KHÔNG dùng Tool, nó sẽ trả về text luôn
            if (response1.text) {
                return response1.text.trim();
            }

            // 4. Nếu Gemini MUỐN dùng Tool (Nó trả về functionCalls)
            if (response1.functionCalls && response1.functionCalls.length > 0) {
                console.log("⚡ Gemini yêu cầu gọi Tools:", response1.functionCalls.map(c => c.name));

                // Bơm yêu cầu của Gemini vào lịch sử
                contents.push({
                    role: 'model',
                    parts: response1.functionCalls.map(call => ({ functionCall: call }))
                });

                const functionResponsesParts = [];

                // Thực thi (Chạy) các tools mà Gemini yêu cầu
                for (const call of response1.functionCalls) {
                    if (!call.name) {
                        console.warn("Ignore the function call as the tool name is missing.");
                        continue;
                    }
                    try {
                        console.log(`Đang chạy tool: ${call.name}...`);
                        // Gọi MCP Client để lấy dữ liệu thực tế
                        const toolResult = await mcpClient.callTool({
                            name: call.name,
                            arguments: (call.args as Record<string, any>) || {}
                        });

                        // Đóng gói kết quả
                        functionResponsesParts.push({
                            functionResponse: {
                                name: call.name,
                                response: toolResult
                            }
                        });
                    } catch (toolError: any) {
                        console.error(`Error using tool ${call.name}:`, toolError.message);
                        functionResponsesParts.push({
                            functionResponse: {
                                name: call.name,
                                response: { error: toolError.message }
                            }
                        });
                    }
                }

                // Bơm kết quả chạy Tool vào lịch sử (như là câu trả lời của user cung cấp dữ liệu cho model)
                contents.push({
                    role: 'user',
                    parts: functionResponsesParts
                });

                console.log("Sending tools to Gemini to generate response...");

                // 5. Lần gọi 2: Gemini đọc kết quả Tool và đưa ra câu trả lời cuối cùng
                const response2 = await this.genAI.models.generateContent({
                    model: this.modelName,
                    contents: contents,
                    config: config,
                });

                return response2.text ? response2.text.trim() : "Không thể tạo câu trả lời sau khi gọi Tool.";
            }

            return "No valid response generated.";
        }
        catch (error: any) {
            console.error("Error generating response from Gemini:", error);
            throw this.normalizeGeminiError(error);
        }
    }

    async generateEmbeddings(data: string | string[], taskType = "RETRIEVAL_DOCUMENT") {
        try {
            const response = await this.genAI.models.embedContent({
                model: 'gemini-embedding-001',
                contents: Array.isArray(data) ? data : [data],
                config: {
                    taskType,
                },
            });

            const embeddings = response.embeddings!.map(e => e.values);
            return embeddings;
        }
        catch (error: any) {
            console.error("Error generating embeddings from Gemini:", error);
            throw this.normalizeGeminiError(error);
        }
    }
}

export const GEMINI = GeminiService.getInstance();
