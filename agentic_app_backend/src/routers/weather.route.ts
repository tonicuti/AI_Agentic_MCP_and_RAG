import express from "express";
import { WeatherController } from "../controllers/weather.controller.js";

const router = express.Router();

router.get("/", WeatherController.getWeather);

export default router;