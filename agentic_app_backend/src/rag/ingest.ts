import { VectorStore } from "./vectorStore/vector.store.ts";
import fs from "node:fs";
import path from "node:path";
import { QWEN } from "../services/llm-emb.service.ts";
import { randomUUID } from "node:crypto";
import { loadRagDataset } from "./dataset.ts";


const CHUNK_SIZE = Number(process.env.RAG_CHUNK_SIZE || 800);
const CHUNK_OVERLAP = Number(process.env.RAG_CHUNK_OVERLAP || 100);

function chunkText(text: string): string[] {
    const chunk: string[] = [];
    let i = 0;

    while (i < text.length) {
        const end = Math.min(i + CHUNK_SIZE, text.length);
        chunk.push(text.slice(i, end));
        i += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunk;
}

export async function ingestFolder(folderPath: string) {
    const Store = VectorStore.get();

    await Store?.init();

    const files = fs.readdirSync(folderPath);

    for (const file of files) {
        if (!file.endsWith('.md') && !file.endsWith(".txt"))
            continue;

        const filePath = path.join(folderPath, file)
        const rawData = fs.readFileSync(filePath, "utf-8");

        //convert string to chunk
        const chunks = chunkText(rawData);

        for (let i = 0; i < chunks.length; i++) {
            const currentChunk = chunks[i];

            const embResult = await QWEN.generateEmbeddings(currentChunk);
            const embeddingVector = embResult[0];

            await Store?.upsert({
                id: randomUUID(),
                docId: file,
                chunkIndex: i,
                text: chunks[i],
                embedding: embeddingVector!,
                metadata: {
                    source: filePath,
                }
            });
        }

        console.log(`Ingested: ${file}`);
    }
}

export async function ingestDataset(split = process.env.HF_DATASET_TRAIN_SPLIT || "train") {
    const Store = VectorStore.get();
    if (process.env.RAG_RESET_COLLECTION !== "false") {
        await Store.reset();
    }
    await Store.init();

    const rows = await loadRagDataset(split);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const chunks = chunkText(row.context);

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const text = chunks[chunkIndex];
            const [embedding] = await QWEN.generateEmbeddings(text);

            await Store.upsert({
                id: `hf-${split}-${rowIndex}-${chunkIndex}`,
                docId: `hf-${split}-${rowIndex}`,
                chunkIndex,
                text,
                embedding,
                metadata: {
                    source: process.env.HF_DATASET || "neural-bridge/rag-dataset-1200",
                    split,
                    rowIndex,
                },
            });
        }
    }

    console.log(`Ingested ${rows.length} Hugging Face dataset rows from split: ${split}`);
}

if (import.meta.url.includes('ingest')) {
    const folder = process.argv[2];

    if (!folder) {
        console.log('usage: node src/rag/ingest.ts --dataset [split]');
        process.exit(1);
    }

    if (folder === "--dataset") {
        ingestDataset(process.argv[3]);
    } else {
        ingestFolder(folder);
    }
}