import { OAuth2Client, type TokenPayload } from "google-auth-library";
import User from "./auth.model.js";
import ApiError from "../../common/utils/api-error.js";
import { generateAnonymousUsername } from "../../common/utils/anonymous-username.util.js";
import { issueTokensFor } from "./auth.service.js";

// Lazy singleton: env is asserted at boot, but lazy-init keeps test seams clean
// and avoids reading process.env at module import time (Vercel cold-start friendly).
let cachedClient: OAuth2Client | null = null;
function getClient(): OAuth2Client {
  if (cachedClient) return cachedClient;
  const audience = process.env.GOOGLE_CLIENT_ID;
  // env.assertEnv() catches this at boot; keep a defensive 500 in case it's bypassed.
  if (!audience) throw new ApiError(500, "GOOGLE_CLIENT_ID is not configured");
  cachedClient = new OAuth2Client(audience);
  return cachedClient;
}

async function verifyIdToken(idToken: string): Promise<TokenPayload> {
  let ticket;
  try {
    ticket = await getClient().verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });
  } catch {
    throw ApiError.unauthorized("Invalid Google credential");
  }
  const payload = ticket.getPayload();
  if (!payload) throw ApiError.unauthorized("Invalid Google credential");
  if (!payload.sub) throw ApiError.unauthorized("Google credential missing subject");
  if (!payload.email) throw ApiError.unauthorized("Google credential missing email");
  // Google sets email_verified=false for unverified addresses; we treat those as
  // unsafe to auto-link (someone could create a Google account with a victim's
  // unverified email and silently take over their account).
  if (payload.email_verified === false) {
    throw ApiError.unauthorized("Google email is not verified");
  }
  return payload;
}

/**
 * Sign in / sign up via a Google ID token (front-channel, GSI flow).
 *
 * Resolution order:
 *  1. Match by `googleId` — returning Google user.
 *  2. Match by `email` — link Google to a pre-existing account (silent merge).
 *  3. Create a new account with `onboardingCompleted=false` so the client routes
 *     them through the role-picker before letting them into the app.
 *
 * In all three cases we issue our normal access + refresh token pair so the rest
 * of the API treats the session identically regardless of how the user signed in.
 */
export const loginWithGoogle = async (idToken: string) => {
  if (!idToken) throw ApiError.badRequest("Google credential missing");

  const payload = await verifyIdToken(idToken);
  const sub = payload.sub!;
  const email = payload.email!.toLowerCase();
  const name = (payload.name || payload.given_name || email.split("@")[0]).slice(0, 50);
  const picture = payload.picture || "";

  // Need +googleId to read the field (it's select:false) and +refreshToken so
  // issueTokensFor can persist a new hash without a second round-trip.
  const selector = "+googleId +refreshToken";

  let user = await User.findOne({ googleId: sub }).select(selector);
  let isNew = false;

  if (!user) {
    user = await User.findOne({ email }).select(selector);
    if (user) {
      // Silent link: an existing account (password-era or otherwise) gets its
      // googleId set so all future Google sign-ins land on the same row.
      user.googleId = sub;
      if (!user.avatar && picture) user.avatar = picture;
    }
  }

  if (!user) {
    user = await User.create({
      name,
      email,
      avatar: picture,
      googleId: sub,
      anonymousUsername: generateAnonymousUsername(),
      role: "user",
      onboardingCompleted: false,
    });
    isNew = true;
  }

  const { accessToken, refreshToken } = await issueTokensFor(
    user as unknown as { _id: unknown; refreshToken?: string | null; save: (opts?: unknown) => Promise<unknown> },
  );

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      anonymousUsername: user.anonymousUsername,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
    },
    accessToken,
    refreshToken,
    isNew,
  };
};
