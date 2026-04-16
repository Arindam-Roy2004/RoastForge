"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Reply, Trash2, Edit2, Check, X, MessageSquare } from "lucide-react";
import { commentApi, type Comment } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { toast } from "sonner";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (h < 1) return `${m}m ago`;
  if (d < 1) return `${h}h ago`;
  return `${d}d ago`;
}

// Tailwind JIT cannot detect dynamic class names, so we need full literals.
const AVATAR_SIZE_CLASS: Record<number, string> = {
  6: "size-6",
  7: "size-7",
  8: "size-8",
  9: "size-9",
  10: "size-10",
};

function Avatar({ name, avatar, size = 8 }: { name: string; avatar?: string; size?: number }) {
  const sizeClass = AVATAR_SIZE_CLASS[size] ?? "size-8";
  return avatar ? (
    <img src={avatar} alt={name} className={`${sizeClass} rounded-full object-cover border border-[var(--color-border)] shrink-0`} />
  ) : (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-[var(--color-primary)] to-orange-600 flex items-center justify-center text-xs font-bold text-white shrink-0`}>
      {name[0]?.toUpperCase() || "?"}
    </div>
  );
}

type CommentItemProps = {
  comment: Comment;
  depth?: number;
  onDeleted: (id: string) => void;
  onAdded: (c: Comment, parentId?: string) => void;
};

function CommentItem({ comment, depth = 0, onDeleted, onAdded }: CommentItemProps) {
  const { user } = useAuth();
  const [upvotes, setUpvotes] = useState(comment.upvotesCount);
  const [downvotes, setDownvotes] = useState(comment.downvotesCount);
  const [myVote, setMyVote] = useState<"upvote" | "downvote" | null>(null);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [currentText, setCurrentText] = useState(comment.text);

  // `userId === null` means the author deleted themselves (or this comment) but
  // replies from other users kept the node alive as a tombstone in the thread.
  const isTombstoned = !comment.userId;
  const authorName = isTombstoned
    ? "[deleted]"
    : comment.userId?.anonymousUsername || comment.userId?.name || "Anonymous";
  const authorAvatar = isTombstoned ? undefined : comment.userId?.avatar;

  const vote = async (type: "upvote" | "downvote") => {
    if (!user) { toast.error("Sign in to vote"); return; }
    try {
      await commentApi.vote(comment._id, type);
      if (myVote === type) {
        setMyVote(null);
        type === "upvote" ? setUpvotes((v) => v - 1) : setDownvotes((v) => v - 1);
      } else {
        if (myVote === "upvote") setUpvotes((v) => v - 1);
        if (myVote === "downvote") setDownvotes((v) => v - 1);
        type === "upvote" ? setUpvotes((v) => v + 1) : setDownvotes((v) => v + 1);
        setMyVote(type);
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Vote failed"); }
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    try {
      const res = await commentApi.addReply(comment._id, replyText.trim());
      if (res.data) {
        onAdded(res.data, comment._id);
        setReplyText("");
        setReplying(false);
        toast.success("Reply added 🔥");
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to reply"); }
  };

  const submitEdit = async () => {
    if (!editText.trim()) return;
    try {
      await commentApi.update(comment._id, editText.trim());
      setCurrentText(editText.trim());
      setEditing(false);
      toast.success("Updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this comment?")) return;
    try {
      await commentApi.delete(comment._id);
      onDeleted(comment._id);
      toast.success("Deleted");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };

  const isOwner = user?.id === comment.userId?._id;

  return (
    <div className={`comment-box ${depth > 0 ? "reply-box mt-3" : "mt-4"} ${isTombstoned ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar name={authorName} avatar={authorAvatar} size={7} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold text-sm ${isTombstoned ? "italic text-[var(--color-muted)]" : ""}`}>{authorName}</span>
            <span className="text-xs text-[var(--color-muted-foreground)]">{timeAgo(comment.createdAt)}</span>
          </div>

          {isTombstoned ? (
            <p className="text-sm italic text-[var(--color-muted)]">{currentText}</p>
          ) : editing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="input text-sm resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button onClick={submitEdit} className="flex items-center gap-1 text-xs text-[var(--color-up)] hover:opacity-80">
                  <Check className="size-3.5" /> Save
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-[var(--color-muted)] hover:opacity-80">
                  <X className="size-3.5" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[var(--color-foreground)]">{currentText}</p>
          )}

          {/* Actions — hidden on tombstoned comments since there's nothing to vote on,
              reply directly to, or edit/delete. Nested replies still render below. */}
          {!isTombstoned && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <button onClick={() => vote("upvote")} className={`vote-btn vote-btn-up ${myVote === "upvote" ? "active" : ""}`}>
                <ChevronUp className="size-4" /> {upvotes}
              </button>
              <button onClick={() => vote("downvote")} className={`vote-btn vote-btn-down ${myVote === "downvote" ? "active" : ""}`}>
                <ChevronDown className="size-4" /> {downvotes}
              </button>
              {depth === 0 && user && (
                <button onClick={() => setReplying(!replying)} className="flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
                  <Reply className="size-3.5" /> Reply
                </button>
              )}
              {isOwner && (
                <>
                  <button onClick={() => { setEditing(true); setEditText(currentText); }} className="flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
                    <Edit2 className="size-3.5" /> Edit
                  </button>
                  <button onClick={handleDelete} className="flex items-center gap-1 text-xs text-[var(--color-down)] hover:opacity-80 transition-colors">
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reply box */}
          {replying && (
            <div className="mt-3 space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${authorName}…`}
                className="input text-sm resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button onClick={submitReply} className="btn-fire px-3 py-1.5 rounded-lg text-xs">
                  Reply 🔥
                </button>
                <button onClick={() => setReplying(false)} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Nested Replies */}
          {(comment.replies || []).map((reply) => (
            <CommentItem key={reply._id} comment={reply} depth={depth + 1} onDeleted={onDeleted} onAdded={onAdded} />
          ))}
        </div>
      </div>
    </div>
  );
}

type Props = {
  resumeId: string;
  initialComments: Comment[];
};

export function CommentThread({ resumeId, initialComments }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!user) { toast.error("Sign in to comment 🔥"); return; }
    setSubmitting(true);
    try {
      const res = await commentApi.add(resumeId, { text: text.trim() });
      if (res.data) {
        setComments((prev) => [{ ...res.data!, replies: [] }, ...prev]);
        setText("");
        toast.success("Comment roasted! 🔥");
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to comment"); }
    finally { setSubmitting(false); }
  };

  const onDeleted = (id: string) => {
    setComments((prev) => prev.filter((c) => c._id !== id).map((c) => ({ ...c, replies: (c.replies || []).filter((r) => r._id !== id) })));
  };

  const onAdded = (c: Comment, parentId?: string) => {
    if (parentId) {
      setComments((prev) => prev.map((cm) => cm._id === parentId ? { ...cm, replies: [...(cm.replies || []), c] } : cm));
    } else {
      setComments((prev) => [{ ...c, replies: [] }, ...prev]);
    }
  };

  return (
    <div>
      {/* Composer */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-start gap-3">
          {user ? (
            <div className="size-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-orange-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {(user.anonymousUsername || user.name)[0].toUpperCase()}
            </div>
          ) : (
            <div className="size-9 rounded-full bg-[var(--color-surface-elevated)] border-2 border-dashed border-[var(--color-border)] shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={user ? "Roast this resume… 🔥" : "Sign in to leave a roast…"}
              className="input text-sm resize-none"
              rows={3}
              disabled={!user}
            />
            {user && (
              <button type="submit" disabled={submitting || !text.trim()} className="btn-fire px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {submitting ? "Posting…" : "Post Roast 🔥"}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Comment list */}
      <div>
        {comments.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-muted)]">
            <MessageSquare className="size-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No roasts yet. Be the first to roast! 🔥</p>
          </div>
        ) : (
          comments.map((c) => (
            <CommentItem key={c._id} comment={c} onDeleted={onDeleted} onAdded={onAdded} />
          ))
        )}
      </div>
    </div>
  );
}
