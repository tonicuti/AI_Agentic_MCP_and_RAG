import express from "express";
import { CustomerController } from "../controllers/customer.controller.ts";

const router = express.Router();

router.get("/", CustomerController.getAllCustomer);
router.get("/:id", CustomerController.getCustomerById);

export default router;