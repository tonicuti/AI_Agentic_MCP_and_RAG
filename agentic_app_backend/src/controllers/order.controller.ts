import type { Request, Response } from "express";
import { OrderService } from "../services/order.service.ts";

export class OrderController {
    static async getAllOrders(req: Request, res: Response) {
        try {
            const { limit } = req.query;
            const orders = await OrderService.getLatestOdersWithCustomerDetails(limit ? Number(limit) : undefined);
            res.json(orders);
        } catch (error) {
            console.error("Error fetching orders:", error);
            res.status(500).json({ error: "Failed to fetch orders" });
        }
    }

    static async getOrderById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const order = await OrderService.getOrderById(id ? String(id) : "");
            if (!order) {
                return res.status(404).json({ error: "Order not found" });
            }
            res.json(order);
        } catch (error) {
            console.error("Error fetching order:", error);
            res.status(500).json({ error: "Failed to fetch order" });
        }
    }
}