import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/common/config/db.js";
import Resume from "../src/modules/resume/resume.model.js";
import User from "../src/modules/auth/auth.model.js";
import { AVATAR_STYLES, type AvatarStyle } from "../src/common/utils/avatar-styles.js";

/**
 * One-shot backfill: freezes a stable avatarStyle + avatarSeed on every legacy
 * resume (docs uploaded before the avatar-customisation feature). Without this,
 * old cards re-derive their look on each render using mutable inputs (anonymous
 * username, current AVATAR_STYLES length), which causes the visible avatar to
 * drift whenever the user rerolls their username or the style list grows.
 *
 * Resolution rules (first match wins):
 *   1. If a resume already has both avatarStyle + avatarSeed set → skip.
 *   2. avatarSeed defaults to the resume _id (immutable, unique).
 *   3. avatarStyle defaults to the owner's preferredAvatarStyle; falls back to
 *      a deterministic pick from AVATAR_STYLES keyed on _id so every legacy row
 *      gets a consistent (but varied) look.
 *
 * Safe to re-run — only writes when fields are missing, and the derived seed is
 * deterministic, so repeated runs produce identical output.
 *
 * Usage: `npm run backfill:avatars`
 */

function sumString(value: string): number {
  let acc = 0;
  for (let i = 0; i < value.length; i += 1) acc += value.charCodeAt(i);
  return Math.abs(acc);
}

function deriveStyleFromId(id: string): AvatarStyle {
  return AVATAR_STYLES[sumString(id) % AVATAR_STYLES.length];
}

async function main() {
  await connectDB();
  console.log("[backfill:avatars] starting resume avatar backfill");

  const filter = {
    $or: [
      { avatarStyle: null },
      { avatarStyle: { $exists: false } },
      { avatarSeed: null },
      { avatarSeed: { $exists: false } },
    ],
  };

  const total = await Resume.countDocuments(filter);
  console.log(`[backfill:avatars] ${total} resumes need backfill`);
  if (total === 0) {
    await mongoose.disconnect();
    return;
  }

  const prefCache = new Map<string, AvatarStyle | null>();
  async function ownerPreferredStyle(userId: mongoose.Types.ObjectId): Promise<AvatarStyle | null> {
    const key = userId.toString();
    if (prefCache.has(key)) return prefCache.get(key) ?? null;
    const user = await User.findById(userId).select("preferredAvatarStyle").lean();
    const pref = user?.preferredAvatarStyle ?? null;
    const resolved =
      pref && (AVATAR_STYLES as readonly string[]).includes(pref) ? (pref as AvatarStyle) : null;
    prefCache.set(key, resolved);
    return resolved;
  }

  const cursor = Resume.find(filter)
    .select("_id userId avatarStyle avatarSeed")
    .cursor();

  let processed = 0;
  let updated = 0;
  let failed = 0;

  for await (const resume of cursor) {
    const id = (resume._id as mongoose.Types.ObjectId).toString();
    try {
      const patch: Partial<{ avatarStyle: AvatarStyle; avatarSeed: string }> = {};

      if (!resume.avatarSeed) patch.avatarSeed = id;

      if (!resume.avatarStyle) {
        const preferred = await ownerPreferredStyle(
          resume.userId as mongoose.Types.ObjectId,
        );
        patch.avatarStyle = preferred ?? deriveStyleFromId(id);
      }

      if (Object.keys(patch).length > 0) {
        await Resume.updateOne({ _id: resume._id }, { $set: patch });
        updated += 1;
      }
      processed += 1;
      if (processed % 50 === 0) {
        console.log(`[backfill:avatars] progress processed=${processed} updated=${updated}`);
      }
    } catch (err) {
      failed += 1;
      console.error(`[backfill:avatars] failed for resume=${id}`, err);
    }
  }

  console.log(
    `[backfill:avatars] done. processed=${processed} updated=${updated} failed=${failed}`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[backfill:avatars] fatal", err);
  process.exit(1);
});
