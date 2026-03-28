import express from "express";
import cors from "cors";
import chatRoutes from "./routers/chat.route.ts";
import customerRoutes from "./routers/customer.route.ts";
import orderRoutes from "./routers/order.route.ts";
import weatherRoutes from "./routers/weather.route.ts";
import mcpRoutes from "./routers/mcp-server.route.ts";
import agentRoutes from "./routers/agent.route.ts";

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/chatWithLlm', chatRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/weather', weatherRoutes);

app.use('/api/chat', agentRoutes);

//mount mcp server on /mcp route
app.use('/mcp', mcpRoutes);

app.get("/", (req, res) => {
    res.send("Hello, this is Agentic Backend");
});

const PORT: number = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
    console.log('')
    console.log(`Server is running on port ${PORT}`);
});