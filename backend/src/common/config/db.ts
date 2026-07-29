import mongoose from "mongoose";

let eventsWired = false;
let connectionPromise: Promise<typeof mongoose> | null = null;

function wireEventHandlers() {
  if (eventsWired) return;
  eventsWired = true;
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected; will reconnect on next query or explicit connect.");
    // Drop cached promise so the next connect() call actually reconnects.
    connectionPromise = null;
  });
  mongoose.connection.on("connected", () => {
    console.log("MongoDB connection re-established.");
  });
}

/**
 * Serverless wants sockets released quickly so idle functions don't hold pool
 * slots. A long-running server wants the opposite: stable, long-lived sockets.
 * Using the serverless numbers on `npm run dev` made the pool tear down every
 * ~45-60s of idling, which is why the log filled with "MongoDB disconnected".
 */
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

function connectionOptions(): mongoose.ConnectOptions {
  const base: mongoose.ConnectOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
  };
  if (isServerless) {
    return { ...base, socketTimeoutMS: 45_000, maxIdleTimeMS: 60_000 };
  }
  // Long-running: no idle reaping, and let sockets sit open between requests.
  return { ...base, minPoolSize: 1, socketTimeoutMS: 0 };
}

const connectDB = async (): Promise<typeof mongoose> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  // Reuse the live connection across serverless invocations / hot reloads.
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectionPromise) return connectionPromise;

  wireEventHandlers();

  connectionPromise = mongoose
    .connect(uri, connectionOptions())
    .then((m) => {
      console.log(`MongoDB connected: ${m.connection.host}`);
      return m;
    })
    .catch((err) => {
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
};

export default connectDB;
