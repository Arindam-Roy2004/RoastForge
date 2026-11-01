import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/common/config/db.js";
import User from "../src/modules/auth/auth.model.js";

/**
 * Admin access is granted here and nowhere else. Keeping it off the HTTP
 * surface means a compromised admin session can't mint more admins, and the
 * first admin doesn't need a bootstrap route.
 *
 *   npm run admin -- grant  <email>
 *   npm run admin -- revoke <email>
 *   npm run admin -- list
 *
 * The account must already exist, i.e. the person has signed in with Google once.
 */
async function main() {
  const [command, rawEmail] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();

  await connectDB();

  if (command === "list") {
    const admins = await User.find({ isAdmin: true }).select("email name").sort({ email: 1 }).lean();
    if (admins.length === 0) console.log("No admins.");
    for (const a of admins) console.log(`${a.email}  ${a.name}`);
    return;
  }

  if ((command !== "grant" && command !== "revoke") || !email) {
    throw new Error("Usage: npm run admin -- <grant|revoke> <email> | list");
  }

  const isAdmin = command === "grant";
  const user = await User.findOneAndUpdate(
    { email },
    // A suspended account being made admin would be locked out of its own panel.
    isAdmin ? { $set: { isAdmin, suspendedAt: null } } : { $set: { isAdmin } },
    { returnDocument: "after" },
  ).lean();
  if (!user) throw new Error(`No account for ${email}. Sign in with Google once, then rerun.`);

  console.log(`${user.email} is ${user.isAdmin ? "now an admin" : "no longer an admin"}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
