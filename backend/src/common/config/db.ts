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
}

const connectDB = async (): Promise<typeof mongoose> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  // Reuse the live connection across serverless invocations / hot reloads.
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectionPromise) return connectionPromise;

  wireEventHandlers();

  connectionPromise = mongoose
    .connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      maxIdleTimeMS: 60_000,
    })
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
