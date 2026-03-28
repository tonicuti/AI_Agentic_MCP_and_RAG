import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RagEngine } from "../../../rag/ragEngine.ts";

export function registerRagTool(mcpServer: McpServer) {
    console.log("Registering RAG tool...");

    mcpServer.registerTool(
        "ragSearch",
        {
            title: "RAG Search",
            description: "Searches a vector database for relevant information based on a query and returns the results.",
            inputSchema: {
                query: z.string(),
                topK: z.number().optional()
            },
            outputSchema: {
                prompt: z.string(), // RAG prompt for LLM to continue
                sources: z.any(),   // metadata + chunks
            },
        },
        async ({ query, topK }) => {
            console.log(`RAG Tool called with query: "${query}" and topK: ${topK}`);

            try {
                const result = await RagEngine.buildPrompt(query, topK);
                return {
                    content: [{
                        type: 'text',
                        text: result.prompt
                    }],
                    structuredContent: {
                        prompt: result.prompt,
                        sources: result.source
                    }
                }
            } catch (error) {
                console.error("Error occurred while building RAG prompt:", error);
                return {
                    content: [{
                        type: 'text',
                        text: 'RAG error: ' + (error as any).message
                    }],
                    structuredContent: {
                        prompt: JSON.stringify({error: (error as any).message}),
                        sources: []
                    }
                }
            }
        }
    );
}