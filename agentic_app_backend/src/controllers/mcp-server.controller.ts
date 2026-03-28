import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "../mcp/server/mcpServer.ts";
import { randomUUID } from "node:crypto";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response } from "express";

// const mcpServer = createMcpServer();

//Toggle session management ON/OFF
const USE_SESSIONS = false;

//Store transports per session (only when USE_SESSION = true)
const sessionTransports: Record<string, StreamableHTTPServerTransport> = {};

export class McpServerController {
    private static getSessionTransport(sessionId?: string) {
        if (!USE_SESSIONS)
            return null;
        return sessionId ? sessionTransports[sessionId] : null;
    }

    private static createTransport() {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: USE_SESSIONS ? () => randomUUID() : undefined,
            enableJsonResponse: true,
            onsessioninitialized: sessionId => {
                if (USE_SESSIONS)
                    sessionTransports[sessionId] = transport;
            }
        });

        //Clean up transport when closed
        //When a transport closes, remove its entry from sessionTransport
        // to prevent memory leaks and avoid keeping stale session data
        if (USE_SESSIONS) {
            transport.onclose = () => {
                if (transport.sessionId)
                    delete sessionTransports[transport.sessionId];
            }
        }

        return transport;
    }

    //post: client -> server
    static async handlePost(req: Request, res: Response) {
        //Check for existing sessionId
        const sessionId = req.headers['mcp-session-id'] as string | undefined;

        let transport = McpServerController.getSessionTransport(sessionId);

        if (USE_SESSIONS) {
            //New initialize request
            if (!transport && isInitializeRequest(req.body)) {
                console.log('Initializing new MCP session...');

                transport = McpServerController.createTransport();

                //Connect to mcp server
                const mcpServer = createMcpServer();
                await mcpServer.connect(transport);
            }

            //Missing or invalid session
            if (!transport) {
                return res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Bad request: No valid session ID provided'
                    },
                    id: null
                })
            };
        }
        else {
            //Stateless mode: new transport per request
            transport = McpServerController.createTransport();

            // Connect to Mcp server
            const mcpServer = createMcpServer();
            await mcpServer.connect(transport);
        }

        if (!transport) {
            return res.status(400).send('Invalid or missing session id');
        }

        //Handle the request 
        await transport.handleRequest(req, res, req.body);
    }

    //Get: server -> client (notification)
    static async handleGet(req: Request, res: Response) {
        if (!USE_SESSIONS) {
            return res.status(400).send('GET not supported in stateless mode');
        }

        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        const transport = McpServerController.getSessionTransport(sessionId);

        if (!transport) {
            return res.status(400).send('Invalid or missing session id');
        }

        await transport.handleRequest(req, res);
    }

    //Delete: End session
    static async handleDelete(req: Request, res: Response) {
        if (!USE_SESSIONS)
            return res.status(400).send('Stateless mode active. No session to delete');

        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        const transport = McpServerController.getSessionTransport(sessionId);

        if (!transport) {
            return res.status(400).send('Invalid or missing session id');
        }

        await transport.handleRequest(req, res);
    }
}

