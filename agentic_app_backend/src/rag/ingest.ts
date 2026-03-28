import { VectorStore } from "./vectorStore/vector.store.ts";
import fs from "node:fs";
import path from "node:path";
import { GEMINI } from "../services/gemini.service.ts";
import { randomUUID } from "node:crypto";


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

            const embResult = await GEMINI.generateEmbeddings(currentChunk);
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

if (import.meta.url.includes('ingest')) {
    const folder = process.argv[2];

    if (!folder) {
        console.log('usage: node src/rag/ingest.ts src/data/rag_docs');
        process.exit(1);
    }

    ingestFolder(folder);
}