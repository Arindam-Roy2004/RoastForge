const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type ApiResult<T = unknown> = { success: boolean; message: string; data?: T };

// ─── Token helpers ───────────────────────────────────────────────────────────
export const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
export const setToken = (t: string) => localStorage.setItem("token", t);
export const clearToken = () => localStorage.removeItem("token");

// ─── Core fetch wrapper ──────────────────────────────────────────────────────
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<ApiResult<T>> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (options.auth !== false) {
    const t = getToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
  }

  const res = await fetch(`${API}${path}`, { ...options, headers, credentials: "include" });
  const json = (await res.json()) as ApiResult<T>;

  if (!res.ok) {
    // Auto-refresh on 401
    if (res.status === 401 && options.auth !== false) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        return apiFetch(path, options);
      }
    }
    throw new Error(json.message || res.statusText);
  }
  return json;
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/api/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.data?.accessToken) {
      setToken(json.data.accessToken);
      return true;
    }
  } catch {}
  return false;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  anonymousUsername?: string;
  role?: string;
};

export type RecruiterCandidateProfile = {
  userId: string;
  anonymousUsername?: string;
  avatar: string;
  talentComposite: number;
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
  register: (body: { name: string; email: string; password: string }) =>
    apiFetch<{ user: User; accessToken: string }>("/api/auth/register", {
      method: "POST", auth: false, body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    apiFetch<{ user: User; accessToken: string }>("/api/auth/login", {
      method: "POST", auth: false, body: JSON.stringify(body),
    }),
  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),
  me: () => apiFetch<User>("/api/auth/me"),
  /** Permanently deletes the account and all related resumes, projects, comments, likes, and votes. */
  deleteAccount: (password: string) =>
    apiFetch("/api/auth/account", { method: "DELETE", body: JSON.stringify({ password }) }),
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
export const RESUME_GALLERY_PAGE_SIZE = 8;

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
  userId: { _id: string; name: string; avatar: string; anonymousUsername?: string };
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
export const uploadApi = {
  resume: async (file: File): Promise<{ fileUrl: string; fileType: "pdf" | "image" }> => {
    const fd = new FormData();
    fd.append("file", file);
    const t = getToken();
    const headers: HeadersInit = t ? { Authorization: `Bearer ${t}` } : {};
    const res = await fetch(`${API}/api/upload/resume`, { method: "POST", headers, body: fd, credentials: "include" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Upload failed");
    return json.data;
  },
  avatar: async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("avatar", file);
    const t = getToken();
    const headers: HeadersInit = t ? { Authorization: `Bearer ${t}` } : {};
    const res = await fetch(`${API}/api/upload/avatar`, { method: "POST", headers, body: fd, credentials: "include" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Upload failed");
    return json.data.avatarUrl;
  },
};
