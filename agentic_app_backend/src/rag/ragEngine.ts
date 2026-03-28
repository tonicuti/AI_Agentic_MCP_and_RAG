import { GEMINI } from "../services/gemini.service.ts";
import { VectorStore } from "./vectorStore/vector.store.ts";

interface RagChunk {
    id: string;
    text: string;
    metadata: any;
    score: number | null;
}

export class RagEngine {
    static async buildPrompt(query: string, topK: number = 4) {
        try {
            const Store = VectorStore.get();
            await Store.init();

            console.log("RAG: Vector store initialized.");
            console.log("RAG: Generating embedding for query...");

            const [queryEmbedding] = await GEMINI.generateEmbeddings([query], "RETRIEVAL_QUERY");

            if(!queryEmbedding) {
                throw new Error("Failed to generate embedding for the query.");
            }

            if(queryEmbedding.length !== Number(process.env.EMBEDDING_DIMS)) {
                throw new Error(`Generated embedding has incorrect dimensions. Expected ${process.env.EMBEDDING_DIMS}, got ${queryEmbedding.length}.`);
            }

            console.log("RAG: Searching vector DB...");
            const results = await Store.search(queryEmbedding, topK);
            if(!results.length) {
                return {
                    prompt: `The knowledge base is currently empty or has not been ingested yet, so no information can be retrieved for the question: "${query}". Please ingest the RAG documents first.`,
                    source: []
                };
            }
            console.log("RAG: Search results:", results);

            /* Build context string in the format:
            SOURCE i:
            < text>
            META: {... metadata JSON ...}
            */
            const context = results.map((r: RagChunk, i: number) => `SOURCE ${i + 1}:\n${r.text}\nMETA: ${JSON.stringify(r.metadata)}`).join("\n\n");

            const prompt = `
                You are an assistant that answers questions based on the following retrieved information. 
                If the retrieved information is not relevant to the question, say "I don't have enough information". 
                Use only the provided information to answer the question. 
                Do not make up any information.:

                CONTEXT:
                ${context}
                QUESTION:
                ${query}
                ANSWER:
            `;

            return { prompt, source: results };
        } catch(error) {
            console.error("Error building prompt:", error);
            throw error;
        }
    }
}
