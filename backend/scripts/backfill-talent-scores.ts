import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/common/config/db.js";
import User from "../src/modules/auth/auth.model.js";
import { recalcTalentScore } from "../src/modules/auth/talent-score.service.js";

/**
 * One-shot backfill: walks every user and recomputes their talent composite
 * so the field reflects pre-existing resumes/likes. Safe to re-run (idempotent).
 *
 * Usage: `npm run backfill:talent`
 */
async function main() {
  await connectDB();
  console.log("[backfill] starting talent-score backfill");

  const cursor = User.find({}).select("_id").cursor();
  let processed = 0;
  let failed = 0;

  for await (const user of cursor) {
    const id = (user._id as mongoose.Types.ObjectId).toString();
    try {
      const score = await recalcTalentScore(id);
      processed += 1;
      if (processed % 50 === 0) {
        console.log(`[backfill] ${processed} users processed (last=${score})`);
      }
    } catch (err) {
      failed += 1;
      console.error(`[backfill] failed for user=${id}`, err);
    }
  }

  console.log(`[backfill] done. processed=${processed} failed=${failed}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[backfill] fatal", err);
  process.exit(1);
});
