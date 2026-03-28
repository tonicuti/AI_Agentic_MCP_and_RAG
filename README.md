# Agentic Chatbot Backend

Backend cho một chatbot kiểu agentic, sử dụng `Gemini` làm mô hình chính, `MCP (Model Context Protocol)` để gọi tool nội bộ, và `RAG` để trả lời các câu hỏi dựa trên knowledge base.

Project này được xây dựng để minh họa một kiến trúc chatbot không chỉ sinh văn bản, mà còn có thể:

- tra cứu knowledge base bằng vector search
- gọi tool lấy dữ liệu thời tiết
- truy vấn dữ liệu đơn hàng và khách hàng
- tách riêng lớp model, tool, RAG engine và API layer

## Kiến trúc tổng quan

Luồng xử lý chính của chatbot:

1. Client gửi message vào API chat.
2. Express route chuyển request tới `AgentController`.
3. `AgentController` gọi `GeminiService.generateResponseWithTools(...)`.
4. `GeminiService` gửi prompt cho Gemini kèm danh sách MCP tools.
5. Nếu Gemini quyết định dùng tool:
   - Gemini trả về `functionCalls`
   - backend gọi MCP client
   - MCP client kết nối đến MCP server nội bộ tại `/mcp`
   - MCP server thực thi tool tương ứng
6. Tool có thể:
   - đọc dữ liệu tĩnh như customer/order
   - gọi weather API
   - gọi `RagEngine` để tìm ngữ cảnh liên quan trong vector database
7. Kết quả tool được gửi lại cho Gemini để tạo câu trả lời cuối cùng.
8. API trả response về cho client.

## Architecture Diagram

```text
Client UI
   |
   v
Express API
   |
   v
AgentController
   |
   v
GeminiService
   |
   +--> Gemini Model
   |
   +--> MCP Client --------------------------+
                                             |
                                             v
                                      MCP Server (/mcp)
                                             |
                        +--------------------+--------------------+
                        |                    |                    |
                        v                    v                    v
                  Customer Tools        Order Tools         Weather Tool
                                                                  |
                                                                  v
                                                            Weather API

                                             |
                                             v
                                         RAG Tool
                                             |
                                             v
                                         RagEngine
                                             |
                                             v
                                   Vector Store Abstraction
                                             |
                          +------------------+------------------+
                          |                                     |
                          v                                     v
                       ChromaDB                              pgvector
```

## Thành phần chính

### 1. API Layer

Express app được mount trong [`src/index.ts`](agentic_app_backend/src/index.ts).

Các route chính:

- `/api/chat`:
  chatbot agentic có thể dùng MCP tools
- `/api/chatWithLlm`:
  gọi Gemini trực tiếp, không qua tool
- `/api/weather`:
  endpoint REST lấy thời tiết
- `/api/orders`:
  dữ liệu đơn hàng
- `/api/customers`:
  dữ liệu khách hàng
- `/mcp`:
  MCP server endpoint

### 2. Controller Layer

Controllers chịu trách nhiệm nhận request HTTP và gọi service tương ứng:

- [`src/controllers/agent.controller.ts`](agentic_app_backend/src/controllers/agent.controller.ts)
- [`src/controllers/chat.controller.ts`](agentic_app_backend/src/controllers/chat.controller.ts)
- [`src/controllers/weather.controller.ts`](agentic_app_backend/src/controllers/weather.controller.ts)
- [`src/controllers/order.controller.ts`](agentic_app_backend/src/controllers/order.controller.ts)
- [`src/controllers/customer.controller.ts`](agentic_app_backend/src/controllers/customer.controller.ts)
- [`src/controllers/mcp-server.controller.ts`](agentic_app_backend/src/controllers/mcp-server.controller.ts)

### 3. Gemini Service

[`src/services/gemini.service.ts`](agentic_app_backend/src/services/gemini.service.ts) là trung tâm điều phối model.

Service này có 3 vai trò chính:

- gọi Gemini để sinh câu trả lời thông thường
- gọi Gemini với tool support thông qua `mcpToTool(...)`
- tạo embeddings cho RAG

Ngoài ra service cũng đang xử lý lỗi quota/rate-limit từ Gemini để API trả về message thân thiện hơn.

### 4. MCP Layer

Project này dùng MCP như một lớp tool execution riêng biệt.

#### MCP Server

[`src/mcp/server/mcpServer.ts`](agentic_app_backend/src/mcp/server/mcpServer.ts) đăng ký các tool:

- `getCustomers`
- `getCustomerById`
- `getAllOrders`
- `getOrdersWithCustomerDetails`
- `getOrdersById`
- `fetchWeatherData`
- `ragSearch`

#### MCP Client

[`src/mcp/client/mcp-client.service.ts`](agentic_app_backend/src/mcp/client/mcp-client.service.ts) kết nối từ backend về chính MCP server nội bộ qua `StreamableHTTPClientTransport`.

Điều này giúp chatbot có một lớp tool-call rõ ràng, tách biệt với controller/service truyền thống.

### 5. RAG Layer

RAG được triển khai qua:

- [`src/rag/ragEngine.ts`](agentic_app_backend/src/rag/ragEngine.ts)
- [`src/rag/ingest.ts`](agentic_app_backend/src/rag/ingest.ts)
- [`src/rag/vectorStore/vector.store.ts`](agentic_app_backend/src/rag/vectorStore/vector.store.ts)

Luồng RAG:

1. Tài liệu trong `src/data/rag_docs` được chia chunk.
2. Mỗi chunk được embed bằng Gemini embedding model.
3. Embedding được lưu vào vector database.
4. Khi user hỏi, query được embed.
5. Hệ thống tìm các chunk gần nhất.
6. `RagEngine` build context prompt và trả lại cho Gemini.

### 6. Vector Store Abstraction

Project hỗ trợ 2 backend vector DB:

- `ChromaDB`
- `pgvector`

Code tương ứng:

- [`src/rag/vectorStore/dbs/chroma.db.ts`](agentic_app_backend/src/rag/vectorStore/dbs/chroma.db.ts)
- [`src/rag/vectorStore/dbs/pgvector.db.ts`](agentic_app_backend/src/rag/vectorStore/dbs/pgvector.db.ts)

Việc này giúp thay đổi vector backend mà không cần sửa logic RAG ở tầng trên.

## Cấu trúc thư mục

```text
src/
  controllers/        # HTTP controllers
  routers/            # Express routes
  services/           # Gemini, weather, order, customer services
  mcp/
    client/           # MCP client nội bộ
    server/           # MCP server và tools
  rag/
    vectorStore/      # Vector DB abstraction + implementations
    ingest.ts         # Ingest markdown/text vào vector DB
    ragEngine.ts      # Retrieval + prompt building
  data/
    rag_docs/         # Knowledge base cho RAG
    *.data.ts         # Mock business data
```

## Chạy dự án

### 1. Cài dependencies

Trong thư mục backend:

```bash
cd agentic_app_backend
npm install
```

Trong thư mục frontend:

```bash
cd ../agentic_app_frontend
npm install
```

### 2. Chạy vector database

Mở terminal tại `agentic_app_backend`:

#### ChromaDB

```bash
python -m venv agentic
agentic\Scripts\activate
pip install chromadb
chroma run --path src/vector-data
```

#### pgvector bằng Docker

```bash
docker run --name rag_postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d pgvector/pgvector:pg16
```

Sau đó tạo extension/database trong PostgreSQL:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE rag_vector_db;
\c rag_vector_db
```

### 3. Ingest knowledge base

Chạy trong `agentic_app_backend`:

```bash
npm run rag:ingest
```

### 4. Chạy backend server

Chạy trong `agentic_app_backend`:

```bash
npm run dev
```

### 5. Chạy frontend

Mở terminal mới và chạy trong `agentic_app_frontend`:

```bash
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173`.

