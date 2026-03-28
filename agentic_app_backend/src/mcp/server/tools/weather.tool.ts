import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WeatherService } from "../../../services/weather.service.ts";


export function registerWeatherTools(mcpServer: McpServer) {
    mcpServer.registerTool(
        'fetchWeatherData',
        {
            title: 'Fetch weather data',
            description: 'Retrieve weather data based on weather api',
            inputSchema: {
                city: z.string(),
                country: z.string().optional()
            },
            outputSchema: {
                weather: z.any()
            }
        },
        async ({ city, country }) => {
            const location = country ? `${city}, ${country}` : city;
            console.log("Fetching weather data for:", location);

            try {
                const weather = await WeatherService.fetchWeatherData(location);

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(weather, null, 2)
                    }],
                    structuredContent: { weather }
                };
            } catch (error) {
                console.error("Error in fetchWeatherData tool:", error);
                throw error;
            }
        }
    )
}
