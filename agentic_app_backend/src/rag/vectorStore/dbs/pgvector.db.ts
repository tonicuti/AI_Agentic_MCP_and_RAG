import { Pool } from "pg";
import pgvector from "pgvector/pg";

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

pool.on('connect', async (client) => {
    console.log('Connected to PostgreSQL database');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await pgvector.registerTypes(client);
})

export class VectorStorePg {
    private static initialized = false;
    private static table = process.env.PGVECTOR_TABLE || "rag_vectors";
    private static dims = Number(process.env.EMBEDDING_DIMS || 3072);

    static async init() {
        if(this.initialized) return;
        this.initialized = true;

        console.log('Initializing PostgreSQL vector store...');

        await pool.query(`CREATE TABLE IF NOT EXISTS ${this.table} (
            id TEXT PRIMARY KEY,
            doc_id TEXT,
            chunk_index INT,
            content TEXT,
            embedding VECTOR(${this.dims}),
            metadata JSONB
        )`);

        console.log('pgvector: Skipping all indexes (3072 dims exceed index limits).');
    }

    static async upsert(params: {
        id: string;
        docId: string;
        chunkIndex: number;
        text: string;
        embedding: number[];
        metadata?: any;
    }) {
        const { id, docId, chunkIndex, text, embedding, metadata = {} } = params;

        // Validate embedding dimensions
        if (embedding.length !== this.dims) {
            throw new Error(`Embedding vector must have ${this.dims} dimensions.`);
        }

        await pool.query(
            `INSERT INTO ${this.table} (id, doc_id, chunk_index, content, embedding, metadata)
             VALUES ($1, $2, $3, $4, $5::vector, $6)
             ON CONFLICT (id) 
             DO UPDATE SET
                content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                metadata = EXCLUDED.metadata`,
            [
                id, 
                docId, 
                chunkIndex, 
                text, 
                pgvector.toSql(embedding), // Convert JS array to pgvector format
                JSON.stringify(metadata)
            ]
        ); 
    }

    static async search(embedding: number[], topK: number = 4) {
        const result = await pool.query(
            `SELECT id, doc_id, chunk_index, content, metadata, embedding <=> $1 AS distance
             FROM ${this.table}
             ORDER BY embedding <=> $1
             LIMIT $2`,
            [
                pgvector.toSql(embedding),
                topK
            ]
        );

        return result.rows.map(row => ({
            id: row.id,
            text: row.content,
            metadata: {
                docId: row.doc_id,
                chunkIndex: row.chunk_index,
                ...row.metadata
            },
            score: row.distance
            }
        ));
    }
}