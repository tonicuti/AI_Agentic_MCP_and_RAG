import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CustomerService } from "../../../services/customer.service.ts";

export function registerCustomerTools(mcpServer: McpServer) {
    console.log("Registering Customer Tools");

    mcpServer.registerTool(
        'getCustomers',
        {
            title: 'Fetch all customers',
            description: 'Retrive all customers from the json data base on limit',
            inputSchema: {
                limit: z.number().optional()
            },
            outputSchema: {
                customers: z.array(
                    z.object({
                        _id: z.string(),
                        name: z.string(),
                        email: z.string(),
                        joinedAt: z.string().optional()
                    })
                )
            }
        },
        async ({ limit }) => {
            console.log('Fetch customers data');
            const customers = await CustomerService.getLatestCustomer(limit);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(customers, null, 2)
                }],
                structuredContent: { customers }
            }
        }
    );

    mcpServer.registerTool(
        'getCustomerById',
        {
            title: 'Fetch customer by Id',
            description: 'Retrieve customer data base on id',
            inputSchema: {
                id: z.string(),
            },
            outputSchema: {
                customers: z.array(
                    z.object({
                        _id: z.string(),
                        name: z.string(),
                        email: z.string(),
                        joinedAt: z.string().optional()
                    })
                )
            }
        },
        async ({ id }) => {
            console.log('Fetch customer by ID...', id);
            const customers = await CustomerService.getCustomerById(id);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(customers, null, 2)
                }],
                structuredContent: { customers }
            }
        }
    )
}