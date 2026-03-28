import { MOCK_CUSTOMERS } from "../data/customers.data.ts";

export class CustomerService {
    static async getLatestCustomer(limit?: number) {
        const sortedCustomers = MOCK_CUSTOMERS.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
        if (limit && limit > 0) {
            return sortedCustomers.slice(0, limit);
        }
        return sortedCustomers;
    }

    static async getCustomerById(id: string) {
        return MOCK_CUSTOMERS.find((customer) => customer._id === id) || null;
    }
}