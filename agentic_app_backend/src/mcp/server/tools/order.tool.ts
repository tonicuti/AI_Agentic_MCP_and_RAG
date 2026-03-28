import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { OrderService } from "../../../services/order.service.ts";

export function registerOrderTools(mcpServer: McpServer) {
    console.log('Registering order tools...')

    mcpServer.registerTool(
        'getAllOrders',
        {
            title: 'Fetch all orders',
            description: 'Retrieve all orders from json data based on limit',
            inputSchema: {
                limit: z.number().optional()
            },
            outputSchema: {
                orders: z.array(
                    z.object({
                        _id: z.string(),
                        product: z.string(),
                        price: z.number(),
                        customer: z.string(),
                        date: z.string()
                    })
                )
            }
        },
        async ({ limit }) => {
            console.log('Fetch orders data by limit...', limit);
            const orders = await OrderService.getLatestOrder(limit);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(orders, null, 2)
                }],
                structuredContent: { orders }
            }
        }
    );

    mcpServer.registerTool(
        'getOrdersWithCustomerDetails',
        {
            title: 'Fetch orders data',
            description: 'Retrieve all orders data from json data based on customer details',
            inputSchema: {
                limit: z.number().optional()
            },
            outputSchema: {
                orders: z.array(
                    z.object({
                        _id: z.string(),
                        product: z.string(),
                        price: z.number(),
                        customer: z.string(),
                        date: z.string()
                    })
                )
            }
        },
        async ({ limit }) => {
            console.log('Fetch orders data...');

            const orders = await OrderService.getLatestOdersWithCustomerDetails(limit);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(orders, null, 2)
                }],
                structuredContent: { orders }
            }
        }
    );

    mcpServer.registerTool(
        'getOrdersById',
        {
            title: 'Fetch orders data by id',
            description: 'Retrieve all orders from json data based on id',
            inputSchema: {
                id: z.string()
            },
            outputSchema: {
                orders: z.array(
                    z.object({
                        _id: z.string(),
                        product: z.string(),
                        price: z.number(),
                        customer: z.string(),
                        date: z.string()
                    })
                )
            }
        },
        async ({ id }) => {
            console.log("Fetch orders data by id...", id);
            const orders = await OrderService.getOrderById(id);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(orders, null, 2)
                }],
                structuredContent: { orders }
            }
        }
    )
}