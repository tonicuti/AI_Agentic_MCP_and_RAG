export interface RagDatasetRow {
    context: string;
    question: string;
    answer: string;
}

const DATASET_NAME = process.env.HF_DATASET || "neural-bridge/rag-dataset-1200";
const DATASET_CONFIG = process.env.HF_DATASET_CONFIG || "default";

interface DatasetApiResponse {
    rows?: Array<{ row: RagDatasetRow }>;
    num_rows_total?: number;
}

function datasetUrl(split: string, offset: number, length: number) {
    const params = new URLSearchParams({
        dataset: DATASET_NAME,
        config: DATASET_CONFIG,
        split,
        offset: String(offset),
        length: String(length),
    });
    return `https://datasets-server.huggingface.co/rows?${params}`;
}

export async function loadRagDataset(split: string, batchSize = 100): Promise<RagDatasetRow[]> {
    const rows: RagDatasetRow[] = [];
    let offset = 0;
    let totalRows: number | undefined;

    while (totalRows === undefined || offset < totalRows) {
        const response = await fetch(datasetUrl(split, offset, batchSize));
        if (!response.ok) {
            throw new Error(`Unable to load Hugging Face dataset (${response.status} ${response.statusText}).`);
        }

        const payload = await response.json() as DatasetApiResponse;
        totalRows = payload.num_rows_total ?? totalRows;
        const batch = payload.rows?.map(item => item.row).filter(isValidRow) ?? [];
        if (batch.length === 0) {
            break;
        }

        rows.push(...batch);
        offset += batch.length;
    }

    return rows;
}

function isValidRow(row: RagDatasetRow): row is RagDatasetRow {
    return Boolean(row && typeof row.context === "string" && typeof row.question === "string" && typeof row.answer === "string");
}
