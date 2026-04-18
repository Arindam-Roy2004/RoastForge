const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type ApiResult<T = unknown> = { success: boolean; message: string; data?: T };

// Joins the API base URL with a path, tolerating missing/trailing slashes.
function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

// Safely parses a fetch response body. Returns a structured ApiResult even when
// the backend returns HTML (proxy error page) or an empty body.
async function parseApiResponse<T>(res: Response): Promise<ApiResult<T>> {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();
  if (contentType.includes("application/json") && rawText) {
    try {
      return JSON.parse(rawText) as ApiResult<T>;
    } catch {
      return { success: res.ok, message: `Invalid JSON from server (${res.status})` };
    }
  }
  return { success: res.ok, message: rawText || res.statusText || `HTTP ${res.status}` };
}

// ─── Token helpers ───────────────────────────────────────────────────────────
export const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
export const setToken = (t: string) => {
  if (typeof window !== "undefined") localStorage.setItem("token", t);
};
export const clearToken = () => {
  if (typeof window !== "undefined") localStorage.removeItem("token");
};

// Single-flight refresh: all 401 callers share one in-flight refresh promise.
let refreshPromise: Promise<boolean> | null = null;
function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(joinUrl(API, "/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const json = await parseApiResponse<{ accessToken?: string }>(res);
      const token = json.data?.accessToken;
      if (token) {
        setToken(token);
        return true;
      }
      return false;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.warn("Token refresh failed", err);
      return false;
    } finally {
      // Release the lock after a tick so concurrent callers share this result.
      setTimeout(() => {
        refreshPromise = null;
      }, 0);
    }
  })();
  return refreshPromise;
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean; _retry?: boolean } = {},
): Promise<ApiResult<T>> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (options.auth !== false) {
    const t = getToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
  }

  const res = await fetch(joinUrl(API, path), { ...options, headers, credentials: "include" });
  const json = await parseApiResponse<T>(res);

  if (!res.ok) {
    // Auto-refresh on 401 (single-flight, retry only once to prevent loops).
    if (res.status === 401 && options.auth !== false && !options._retry) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        return apiFetch<T>(path, { ...options, _retry: true });
      }
    }
    throw new Error(json.message || res.statusText || `HTTP ${res.status}`);
  }
  return json;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  anonymousUsername?: string;
  role?: string;
  // False for fresh Google sign-ups until they pick Candidate/Recruiter on
  // /onboarding/role. The auth store reads this to gate that redirect.
  onboardingCompleted?: boolean;
};

export type RecruiterCandidateProfile = {
  userId: string;
  anonymousUsername?: string;
  avatar: string;
  talentComposite: number;
  targetRole?: string;
  skills?: string[];
  identity: {
    displayName: string;
    linkedInUrl: string;
    githubUrl: string;
  } | null;
  projects: Array<{
    _id: string;
    title: string;
    description: string;
    techStack: string[];
    githubUrl: string;
    liveDemo: string;
    aiStatus?: string;
    aiEvaluation?: { codeQuality: number; complexity: number; summary: string; extractedSkills?: string[] };
    createdAt: string;
  }>;
  resumes: Array<{
    _id: string;
    title?: string;
    blurb?: string;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    aiScoreOverall?: number;
  }>;
};

export const recruiterApi = {
  candidateProfile: (userId: string) =>
    apiFetch<RecruiterCandidateProfile>(`/api/recruiter/candidate/${encodeURIComponent(userId)}/profile`),
};

export const authApi = {
  /** Exchange a Google ID token (from GSI) for our session tokens. */
  google: (credential: string) =>
    apiFetch<{ user: User; accessToken: string }>("/api/auth/google", {
      method: "POST", auth: false, body: JSON.stringify({ credential }),
    }),
  /** Complete the Candidate/Recruiter picker shown to first-time Google users. */
  completeOnboarding: (role: "user" | "recruiter") =>
    apiFetch<{ user: User }>("/api/auth/me/complete-onboarding", {
      method: "POST", body: JSON.stringify({ role }),
    }),
  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),
  me: () => apiFetch<User>("/api/auth/me"),
  /**
   * Permanently deletes the account and all related resumes, projects, comments,
   * likes, and votes. Confirmation is the user's own email typed back — we have
   * no password to verify since accounts are Google-only.
   */
  deleteAccount: (confirmEmail: string) =>
    apiFetch("/api/auth/account", { method: "DELETE", body: JSON.stringify({ confirmEmail }) }),
};

// ─── Resumes ─────────────────────────────────────────────────────────────────
export type VerdictBar = { id: string; label: string; score: number };

export type AiRoast = {
  score: number;
  roastText: string;
  verdictBars: VerdictBar[];
};

export type Resume = {
  _id: string;
  userId: { _id: string; name: string; avatar: string; anonymousUsername?: string };
  title?: string;
  name?: string;
  blurb?: string;
  fileUrl: string;
  fileType: "pdf" | "image";
  version?: number;
  candidateAlias?: string;
  aiScore?: { [key: string]: number };
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  /** Present only for the resume owner (API strips for others). */
  isOwner?: boolean;
  aiRoast?: AiRoast;
  roastHash?: string | null;
  createdAt: string;
};

export type ResumeListResult = {
  resumes: Resume[];
  total: number;
  page: number;
  pages: number;
};

/** Must match `PAGE_SIZE` in backend `resume.service.ts`. */
export const RESUME_GALLERY_PAGE_SIZE = 4;

export const resumeApi = {
  list: (params: { page?: number; sort?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    const page = params.page != null && params.page > 0 ? params.page : 1;
    q.set("page", String(page));
    if (params.sort) q.set("sort", params.sort);
    if (params.search) q.set("search", params.search);
    return apiFetch<ResumeListResult>(`/api/resumes?${q}`);
  },
  get: (id: string) => apiFetch<Resume>(`/api/resumes/${id}`),
  my: () => apiFetch<Resume[]>("/api/resumes/my"),
  create: (body: { title: string; name: string; blurb?: string; fileUrl: string; fileType: "pdf" | "image" }) =>
    apiFetch<Resume>("/api/resumes", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: { title?: string; name?: string; blurb?: string }) =>
    apiFetch<Resume>(`/api/resumes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch(`/api/resumes/${id}`, { method: "DELETE" }),
  like: (id: string) => apiFetch<{ liked: boolean }>(`/api/resumes/${id}/like`, { method: "POST" }),
};

// ─── AI Analysis ─────────────────────────────────────────────────────────────
export type RoastData = {
  cached: boolean;
  score: number;
  roastText: string;
  verdictBars: VerdictBar[];
};

export const analysisApi = {
  roast: (resumeId: string) =>
    apiFetch<RoastData>(`/api/analysis/${resumeId}`, { method: "POST" }),
};

// ─── Comments ────────────────────────────────────────────────────────────────
export type Comment = {
  _id: string;
  // `null` when the author deleted themselves (or the comment) but replies from
  // other users kept the node alive as a tombstone. The UI renders these as
  // "[deleted]" with actions hidden.
  userId: { _id: string; name: string; avatar: string; anonymousUsername?: string } | null;
  text: string;
  parentId: string | null;
  upvotesCount: number;
  downvotesCount: number;
  createdAt: string;
  replies?: Comment[];
};

export const commentApi = {
  list: (resumeId: string) => apiFetch<Comment[]>(`/api/comments/resume/${resumeId}`),
  add: (resumeId: string, body: { text: string; parentId?: string | null }) =>
    apiFetch<Comment>(`/api/comments/resume/${resumeId}`, { method: "POST", body: JSON.stringify(body) }),
  addReply: (commentId: string, text: string) =>
    apiFetch<Comment>(`/api/comments/${commentId}/replies`, { method: "POST", body: JSON.stringify({ text }) }),
  vote: (commentId: string, voteType: "upvote" | "downvote") =>
    apiFetch(`/api/comments/${commentId}/vote`, { method: "POST", body: JSON.stringify({ voteType }) }),
  update: (commentId: string, text: string) =>
    apiFetch(`/api/comments/${commentId}`, { method: "PUT", body: JSON.stringify({ text }) }),
  delete: (commentId: string) => apiFetch(`/api/comments/${commentId}`, { method: "DELETE" }),
};

// ─── Upload ──────────────────────────────────────────────────────────────────
type SignedUpload = {
  cloudName: string;
  apiKey: string;
  resourceType: "raw" | "image";
  uploadUrl: string;
  params: {
    timestamp: number;
    folder: string;
    public_id: string;
    signature: string;
  };
};

/**
 * Uploads resumes directly from the browser to Cloudinary using a signed,
 * short-lived payload from our API. The file never touches our Vercel function
 * — sidesteps the ~4.5 MB request-body cap and keeps cold-start CPU free for
 * the roast path.
 */
async function directCloudinaryUpload(file: File): Promise<{ fileUrl: string; fileType: "pdf" | "image" }> {
  const isPdf = file.type === "application/pdf";
  const fileType: "pdf" | "image" = isPdf ? "pdf" : "image";

  const signed = await apiFetch<SignedUpload>("/api/upload/sign/resume", {
    method: "POST",
    body: JSON.stringify({ fileType, contentType: file.type }),
  });
  if (!signed.data) throw new Error(signed.message || "Could not sign upload");
  const s = signed.data;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", s.apiKey);
  fd.append("timestamp", String(s.params.timestamp));
  fd.append("signature", s.params.signature);
  fd.append("folder", s.params.folder);
  fd.append("public_id", s.params.public_id);

  // `credentials: "omit"` — this request goes to api.cloudinary.com, which
  // doesn't want our session cookie and would otherwise trigger a CORS preflight.
  const res = await fetch(s.uploadUrl, { method: "POST", body: fd, credentials: "omit" });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.message || "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(detail || `Cloudinary upload failed (${res.status})`);
  }
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error("Cloudinary returned no URL");
  return { fileUrl: json.secure_url, fileType };
}

export const uploadApi = {
  resume: directCloudinaryUpload,
  avatar: async (file: File): Promise<string> => {
    // Avatars stay on the server path — they're small (single-digit KB up to
    // a few hundred KB) and share the same error handling as other endpoints.
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await apiFetch<{ avatarUrl: string }>("/api/upload/avatar", {
      method: "POST",
      body: fd,
    });
    if (!res.data?.avatarUrl) throw new Error(res.message || "Upload failed");
    return res.data.avatarUrl;
  },
};
