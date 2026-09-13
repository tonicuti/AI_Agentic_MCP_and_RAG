import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { loadRagDataset, type RagDatasetRow } from "../rag/dataset.ts";
import { QWEN } from "../services/llm-emb.service.ts";

interface RetrievalResult {
    index: number;
    score: number;
}

interface RetrievalMetrics {
    precisionAtK: number;
    recallAtK: number;
    ndcgAtK: number;
}

function cosineSimilarity(left: number[], right: number[]) {
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;

    for (let index = 0; index < left.length; index++) {
        dot += left[index] * right[index];
        leftNorm += left[index] ** 2;
        rightNorm += right[index] ** 2;
    }

    return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function calculateRetrievalMetrics(results: RetrievalResult[], relevantIndex: number, topK: number): RetrievalMetrics {
    const topResults = results.slice(0, topK);
    const hitRank = topResults.findIndex(result => result.index === relevantIndex);
    const hit = hitRank >= 0;

    return {
        precisionAtK: hit ? 1 / topK : 0,
        recallAtK: hit ? 1 : 0,
        ndcgAtK: hit ? 1 / Math.log2(hitRank + 2) : 0,
    };
}

function average(metrics: RetrievalMetrics[]) {
    return metrics.reduce((total, item) => ({
        precisionAtK: total.precisionAtK + item.precisionAtK / metrics.length,
        recallAtK: total.recallAtK + item.recallAtK / metrics.length,
        ndcgAtK: total.ndcgAtK + item.ndcgAtK / metrics.length,
    }), { precisionAtK: 0, recallAtK: 0, ndcgAtK: 0 });
}

async function calculateBleu(references: string[], hypotheses: string[]) {
    console.log(`[BENCHMARK] Calculating BLEU for ${hypotheses.length} generated answers...`);
    const python = `import json, sys\nfrom nltk.translate.bleu_score import sentence_bleu, SmoothingFunction\ndata = json.load(sys.stdin)\nsmoother = SmoothingFunction().method1\nvalues = [sentence_bleu([reference.split()], hypothesis.split(), smoothing_function=smoother) for reference, hypothesis in zip(data["references"], data["hypotheses"])]\nprint(sum(values) / len(values) if values else 0)`;
    const payload = JSON.stringify({ references, hypotheses });

    return new Promise<number>((resolve, reject) => {
        const childProcess: ChildProcessWithoutNullStreams = spawn(process.env.PYTHON_BIN || "python", ["-c", python]);
        let output = "";
        let error = "";
        childProcess.stdout.on("data", (chunk: Buffer) => output += chunk.toString());
        childProcess.stderr.on("data", (chunk: Buffer) => error += chunk.toString());
        childProcess.on("error", reject);
        childProcess.on("close", (code: number | null) => code === 0 ? resolve(Number(output.trim())) : reject(new Error(error || `NLTK exited with code ${code}`)));
        childProcess.stdin.end(payload);
    });
}

async function runBenchmark() {
    const split = process.env.HF_DATASET_TEST_SPLIT || "test";
    console.log(`[BENCHMARK] Loading dataset: ${process.env.HF_DATASET || "neural-bridge/rag-dataset-1200"} (${split})`);
    const testRows = await loadRagDataset(split);
    console.log(`[BENCHMARK] Loaded ${testRows.length} dataset rows.`);
    const rows = Number(process.env.RAG_BENCHMARK_LIMIT || testRows.length) > 0
        ? testRows.slice(0, Number(process.env.RAG_BENCHMARK_LIMIT || testRows.length))
        : testRows;
    const topK = Number(process.env.RAG_BENCHMARK_TOP_K || 5);
    console.log(`[BENCHMARK] Running with ${rows.length} rows and topK=${topK}.`);

    console.log("[BENCHMARK] Step 1/2: Generating context embeddings...");
    const contexts = await QWEN.generateEmbeddings(rows.map(row => row.context));
    console.log(`[BENCHMARK] Generated ${contexts.length} context embeddings.`);

    console.log("[BENCHMARK] Generating question embeddings...");
    const queries = await QWEN.generateEmbeddings(rows.map(row => row.question));
    console.log(`[BENCHMARK] Generated ${queries.length} question embeddings.`);
    const retrievalMetrics: RetrievalMetrics[] = [];
    const retrievedContexts: string[] = [];
    const hypotheses: string[] = [];

    for (let index = 0; index < rows.length; index++) {
        const ranked: RetrievalResult[] = contexts
            .map((embedding, contextIndex) => ({ index: contextIndex, score: cosineSimilarity(queries[index], embedding) }))
            .sort((left, right) => right.score - left.score);
        retrievalMetrics.push(calculateRetrievalMetrics(ranked, index, topK));
        retrievedContexts.push(ranked.slice(0, topK).map(result => rows[result.index].context).join("\n\n"));
        if (index === 0 || (index + 1) % 10 === 0 || index === rows.length - 1) {
            console.log(`[BENCHMARK] Retrieval progress: ${index + 1}/${rows.length}`);
        }
    }

    const metrics = average(retrievalMetrics);
    console.log("[BENCHMARK] Step 1/2 complete. Retrieval metrics calculated.");
    console.log("[BENCHMARK] Step 2/2: Generating answers...");
    for (let index = 0; index < rows.length; index++) {
        hypotheses.push(await QWEN.generateResponse(`Context:\n${retrievedContexts[index]}\n\nQuestion:\n${rows[index].question}\n\nAnswer:`));
        if (index === 0 || (index + 1) % 10 === 0 || index === rows.length - 1) {
            console.log(`[BENCHMARK] Generation progress: ${index + 1}/${rows.length}`);
        }
    }
    const bleu = await calculateBleu(rows.map(row => row.answer), hypotheses);
    console.log("[BENCHMARK] Step 2/2 complete.");
    console.log(JSON.stringify({ dataset: process.env.HF_DATASET || "neural-bridge/rag-dataset-1200", split, samples: rows.length, topK, retrieval: metrics, generation: { bleu } }, null, 2));
}

runBenchmark().catch(error => {
    console.error("RAG benchmark failed:", error);
    process.exitCode = 1;
});
