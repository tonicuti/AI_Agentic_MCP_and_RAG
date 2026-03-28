import type { Request, Response } from "express";
import { CustomerService } from "../services/customer.service.ts";

export class CustomerController {
    static async getAllCustomer(req: Request, res: Response) {
        try {
            const { limit } = req.query;
            const customers = await CustomerService.getLatestCustomer(limit ? Number(limit) : undefined);
            res.json(customers);
        } catch (error) {
            console.error("Error fetching customers:", error);
            res.status(500).json({ error: "Failed to fetch customers" });
        }
    }

    static async getCustomerById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const customer = await CustomerService.getCustomerById(id ? String(id) : "");
            if (!customer) {
                return res.status(404).json({ error: "Customer not found" });
            }
            res.json(customer);
        } catch (error) {
            console.error("Error fetching customer:", error);
            res.status(500).json({ error: "Failed to fetch customer" });
        }
    }
}