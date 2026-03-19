import cors from "cors";
import express from "express";
import { config } from "./config.js";
import chatRoutes from "./routes/chat.js";
import conversationRoutes from "./routes/conversation.js";
import settingsRoutes from "./routes/settings.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/chat", chatRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/settings", settingsRoutes);

app.listen(config.server.port, () => {
  console.log(`Server running on port ${config.server.port}`);
});
