export class WeatherService {
    static async fetchWeatherData(location: string): Promise<any> {
        const apiKey = process.env.WEATHER_API_KEY;
        if (!apiKey) {
            throw new Error("Missing WEATHER_API_KEY");
        }

        const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(location)}&aqi=no`;
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Failed to fetch weather data (${response.status} ${response.statusText}): ${errorText}`
            );
        }

        const data = await response.json();

        return data;
    }
}
