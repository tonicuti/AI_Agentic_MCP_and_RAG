import express from "express";
import { AgentController } from "../controllers/agent.controller.ts";

const router = express.Router();

router.post("/", AgentController.chat);

export default router;