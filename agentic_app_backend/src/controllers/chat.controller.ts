import type { NextFunction, Request, Response } from "express";
import { GEMINI } from "../services/gemini.service.ts";

export class chatController {
    static async generateResponse(req: Request, res: Response, next: NextFunction) {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        try {
            const response = await GEMINI.generateResponse(message);
            res.json({ reply: response });
        }
        catch (error: any) {
            console.error("Error in chat endpoint:", error);
            res.status(500).json({ error: "Failed to generate response" });
        }
    }
}