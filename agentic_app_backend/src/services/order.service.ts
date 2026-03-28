import { MOCK_ORDERS } from "../data/orders.data.ts";
import { MOCK_CUSTOMERS } from "../data/customers.data.ts";

export class OrderService {
    static async getLatestOrder(limit?: number) {
        const sortedOrders = MOCK_ORDERS.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (limit && limit > 0) {
            return sortedOrders.slice(0, limit);
        }
        return sortedOrders;
    }

    static async getLatestOdersWithCustomerDetails(limit?: number) {
        const customers = MOCK_CUSTOMERS;

        const orders = MOCK_ORDERS.map((order) => {
            const customer = customers.find((customer) => customer._id === order.customer);
            return {
                ...order,
                customer: customer?.name
            };
        });

        const sortedOrders = orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (limit && limit > 0) {
            return sortedOrders.slice(0, limit);
        }
        return sortedOrders;
    }

    static async getOrderById(id: string) {
        return MOCK_ORDERS.find((order) => order._id === id) || null;
    }
}