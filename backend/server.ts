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

// Surface failures that never reach the Express error handler (fire-and-forget
// promises, event-emitter callbacks). Without these they vanish silently and a
// request just returns a bare 500.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
// An uncaught exception leaves the process in an undefined state, so log and
// exit rather than limping along. nodemon / the platform will restart it.
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
