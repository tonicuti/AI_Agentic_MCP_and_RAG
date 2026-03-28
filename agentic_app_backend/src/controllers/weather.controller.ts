import type { Request, Response } from "express";
import { WeatherService } from "../services/weather.service.js";

export class WeatherController {
    static async getWeather(req: Request, res: Response) {
        try {
            const location = req.query.q || "Hanoi";
            if (!location) {
                return res.status(400).json({
                    success: false,
                    error: "Parameter location is required. Example: ?q=Hanoi"
                });
            }

            const weatherData = await WeatherService.fetchWeatherData(String(location));
            res.json({
                success: true,
                data: weatherData
            });
        } catch (error) {
            console.error("Error fetching weather data:", error);
            res.status(500).json({ error: "Failed to fetch weather data" });
        }
    }
}
