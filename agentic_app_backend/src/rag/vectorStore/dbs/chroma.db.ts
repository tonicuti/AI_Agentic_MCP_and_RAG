import { ChromaClient } from 'chromadb';
import { randomUUID } from 'crypto';

const chroma = new ChromaClient({
    host: process.env.CHROMA_HOST || "localhost",
    port: process.env.CHROMA_PORT ? parseInt(process.env.CHROMA_PORT) : 8000,
    ssl: process.env.CHROMA_SSL === "true"
});

const COLLECTION = process.env.CHROMA_COLLECTION || 'rag_documents';

export class VectorStoreChroma {
    private static collection: any;

    static async init() {
        this.collection = await chroma.getOrCreateCollection({
            name: COLLECTION
        });
        console.log(`Connected ChromaDB Collection: ${COLLECTION}`);
    }

    static async upsert(params: {       // If documents existed: update, and do not exist: insert
        id: string,
        docId: string,
        chunkIndex: number, // the position of chunk
        text: string,
        embedding: number[],
        metadata?: any
    }) {
        const { id, docId, chunkIndex, text, embedding, metadata = {} } = params;

        await this.collection.upsert({
            ids: [id],
            documents: [text],
            embeddings: [embedding],
            metadatas: [
                {
                    docId,
                    chunkIndex,
                    ...metadata
                }
            ]
        });
    }

    static async search(embedding: number[], topK: number = 4) {
        const count = await this.collection.count();
        console.log(`Chroma collection document count: ${count}`);

        if (count === 0) {
            return [];
        }

        const result = await this.collection.query({
            queryEmbeddings: [embedding],
            n_results: topK
        });

        if (!result.documents || result.documents.length === 0 || !result.documents[0]) {
            return [];
        }

        return result.documents[0].map((doc: string, i: number) => ({
            id: randomUUID(),
            text: doc,
            metadata: result.metadatas?.[0]?.[i] || {},
            score: result.distances?.[0]?.[i] ?? null
        }));
    }
}
