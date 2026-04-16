import "dotenv/config";
import http from "http";
import app from "./src/app.js";
import connectDB from "./src/common/config/db.js";
import { assertEnv } from "./src/common/config/env.js";

const PORT = process.env.PORT || 5000;

const start = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set in environment");
    process.exit(1);
  }
  try {
    assertEnv();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
  await connectDB();

  const httpServer = http.createServer(app);
  httpServer.listen(PORT, () => {
    console.log(`🔥 RoastForge API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  });
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
