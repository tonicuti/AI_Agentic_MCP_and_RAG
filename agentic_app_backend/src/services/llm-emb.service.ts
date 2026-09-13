import { pipeline } from "@huggingface/transformers";
import type { Client } from "@modelcontextprotocol/sdk/client";

interface TextGenerationResult {
    generated_text?: string;
}

type TextGenerator = (text: string, options?: Record<string, unknown>) => Promise<unknown>;
type EmbeddingGenerator = (text: string, options?: Record<string, unknown>) => Promise<{ data: Float32Array | number[] }>;
type QwenDtype = "q4" | "auto" | "fp32" | "fp16" | "q8" | "int8" | "uint8" | "bnb4" | "q4f16";

const supportedQwenDtypes: QwenDtype[] = ["q4", "auto", "fp32", "fp16", "q8", "int8", "uint8", "bnb4", "q4f16"];

function getQwenDtype(): QwenDtype {
    const configuredDtype = process.env.QWEN_DTYPE;
    return configuredDtype && supportedQwenDtypes.includes(configuredDtype as QwenDtype)
        ? configuredDtype as QwenDtype
    : "fp32";
}

class QwenService {
    private static instance: QwenService;
    private textGenerator?: Promise<TextGenerator>;
    private embeddingGenerator?: Promise<EmbeddingGenerator>;

    private readonly modelName = process.env.QWEN_MODEL || "onnx-community/Qwen3-0.6B-ONNX";
    private readonly embeddingModelName = process.env.EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";

    static getInstance() {
        if (!QwenService.instance) {
            QwenService.instance = new QwenService();
        }
        return QwenService.instance;
    }

    private getTextGenerator() {
        if (!this.textGenerator) {
            const dtype = getQwenDtype();
            console.log(`[QWEN] Loading text-generation model: ${this.modelName} (${dtype})`);
            this.textGenerator = pipeline("text-generation", this.modelName, { dtype })
                .then(generator => {
                    console.log("[QWEN] Text-generation model loaded.");
                    return generator as unknown as TextGenerator;
                });
        }
        return this.textGenerator;
    }

    private getEmbeddingGenerator() {
        if (!this.embeddingGenerator) {
            console.log(`[QWEN] Loading embedding model: ${this.embeddingModelName}`);
            this.embeddingGenerator = pipeline("feature-extraction", this.embeddingModelName)
                .then(generator => {
                    console.log("[QWEN] Embedding model loaded.");
                    return generator as unknown as EmbeddingGenerator;
                });
        }
        return this.embeddingGenerator;
    }

    async generateResponse(prompt: string) {
        try {
            const generator = await this.getTextGenerator();
            const output = await generator(prompt, {
                max_new_tokens: Number(process.env.QWEN_MAX_NEW_TOKENS || 256),
                temperature: 0.2,
                do_sample: false,
            }) as TextGenerationResult[];

            const generatedText = output[0]?.generated_text || "No response generated";
            return generatedText.startsWith(prompt) ? generatedText.slice(prompt.length).trim() : generatedText.trim();
        } catch (error) {
            console.error("Error generating response from Qwen:", error);
            throw error;
        }
    }

    async generateResponseWithTools(prompt: string, mcpClient: Client) {
        let ragContext = "";

        try {
            const toolResult = await mcpClient.callTool({
                name: "ragSearch",
                arguments: { query: prompt, topK: Number(process.env.RAG_TOP_K || 4) },
            });
            const content = toolResult.content as Array<{ type?: string; text?: string }> | undefined;
            const textContent = content?.find(item => item.type === "text");
            ragContext = textContent?.text || "";
        } catch (error) {
            console.warn("RAG tool was unavailable; generating without retrieved context.", error);
        }

        const augmentedPrompt = ragContext
            ? `${ragContext}\n\nUSER QUESTION:\n${prompt}\n\nAnswer using only the retrieved context when it is relevant.`
            : prompt;

        return this.generateResponse(augmentedPrompt);
    }

    async generateEmbeddings(data: string | string[]) {
        const generator = await this.getEmbeddingGenerator();
        const texts = Array.isArray(data) ? data : [data];
        const embeddings: number[][] = [];

        for (const text of texts) {
            const output = await generator(text, { pooling: "mean", normalize: true });
            embeddings.push(Array.from(output.data));
        }

        return embeddings;
    }
}

export const QWEN = QwenService.getInstance();
