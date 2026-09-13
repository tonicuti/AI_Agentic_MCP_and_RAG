import type { Request, Response } from "express";
import { QWEN } from "../services/llm-emb.service.ts";
import { MCPClient } from "../mcp/client/mcp-client.service.ts";

export class AgentController {
    static async chat(req: Request, res: Response) {
        const { message, model } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const selectedModel = model || "qwen";
        try {
            if (selectedModel === "qwen") {
                const mcp = await MCPClient.init();
                const response = await QWEN.generateResponseWithTools(message, mcp.client);
                res.json({ reply: response });
            }
        }
        catch (error: any) {
            console.error("Error in chat endpoint:", error);
            res.status(error?.statusCode || 500).json({
                error: error?.userMessage || "Failed to generate response"
            });
        }
    }
}
