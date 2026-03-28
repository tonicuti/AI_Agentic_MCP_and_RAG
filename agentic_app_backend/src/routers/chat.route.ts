import express from "express";
import { chatController } from "../controllers/chat.controller.ts";

const router = express.Router();

router.post("/", chatController.generateResponse);

export default router;