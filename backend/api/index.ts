import app from "../src/app.js";
import connectDB from "../src/common/config/db.js";

let dbConnected = false;

export default async function handler(req: any, res: any) {
  if (!dbConnected) {
    if (process.env.MONGODB_URI) {
      await connectDB();
      dbConnected = true;
    }
  }
  return app(req, res);
}
