import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

class McpClientService {
    private static instance: McpClientService;
    client: Client;
    private initialized = false;

    constructor() {
        this.client = new Client({
            name: 'node-mcp-client',
            version: '1.0.0'
        });
    }

    static getInstance(): McpClientService {
        if (!McpClientService.instance) {
            McpClientService.instance = new McpClientService();
        }
        return McpClientService.instance;
    }

    //Connect to the mcp server
    async init() {
        if (this.initialized)
            return this;

        const url = `${process.env.SERVER}:${process.env.PORT}/mcp`;

        const transport = new StreamableHTTPClientTransport(new URL(url));

        this.client.connect(transport);
        this.initialized = true;

        return this;
    }
}

export const MCPClient = McpClientService.getInstance();