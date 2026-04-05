"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import {
  fetchActivityFeedAction,
  toggleSessionLikeAction,
  fetchSessionCommentsAction,
  addSessionCommentAction,
  fetchProfilesByIdsAction,
  createPostAction,
  deletePostAction,
  togglePinPostAction,
  togglePostReactionAction,
  fetchPostCommentsAction,
  addPostCommentAction,
  reportPostAction,
  hidePostAction,
  uploadImageAction,
} from "@/actions/db";
import { formatRelative } from "@/lib/utils";
import { useWingRequests } from "@/hooks/useWingRequests";
import type { PublicProfile, SessionComment, ReactionType, PostComment } from "@/types";
import { JOURNAL_TAG_LABELS, JOURNAL_TAG_COLORS, REACTION_EMOJIS } from "@/types";
import { useToast } from "@/hooks/useToast";

// ─── Types ────────────────────────────────────────────
interface FeedItem {
  type: "session" | "journal" | "post";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  profile: PublicProfile | null;
  likeCount?: number;
  commentCount?: number;
  reactions?: Record<string, number>;
  userReaction?: string | null;
  createdAt: string;
}

type FeedScope = "all" | "wings" | "public";
const TABS: { key: FeedScope; label: string }[] = [
  { key: "all", label: "Pour toi" },
  { key: "wings", label: "Wings" },
  { key: "public", label: "Public" },
];

const PAGE_SIZE = 20;

// ─── Skeleton ─────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card className="!p-4 animate-pulse">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--surface-bright)]" />
        <div className="flex-1">
          <div className="h-3 w-24 bg-[var(--surface-bright)] rounded mb-1" />
          <div className="h-2 w-16 bg-[var(--surface-bright)] rounded" />
        </div>
        <div className="h-2 w-12 bg-[var(--surface-bright)] rounded" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 w-full bg-[var(--surface-bright)] rounded" />
        <div className="h-3 w-3/4 bg-[var(--surface-bright)] rounded" />
      </div>
      <div className="flex gap-4 pt-2 border-t border-[var(--border)]">
        <div className="h-4 w-10 bg-[var(--surface-bright)] rounded" />
        <div className="h-4 w-10 bg-[var(--surface-bright)] rounded" />
      </div>
    </Card>
  );
}

// ─── Reaction picker ──────────────────────────────────
function ReactionPicker({
  reactions,
  userReaction,
  onReact,
}: {
  reactions: Record<string, number>;
  userReaction: string | null;
  onReact: (r: ReactionType) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const total = Object.values(reactions).reduce((a, b) => a + b, 0);

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
          userReaction
            ? "bg-[var(--primary)]/15 text-[var(--primary)]"
            : "text-[var(--outline)] hover:bg-[var(--surface-bright)]"
        }`}
      >
        {userReaction ? REACTION_EMOJIS[userReaction as ReactionType] : "+"} {total > 0 && total}
      </button>
      {/* Existing reaction badges */}
      {Object.entries(reactions)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => (
          <button
            key={type}
            onClick={() => onReact(type as ReactionType)}
            className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full transition-all ${
              userReaction === type
                ? "bg-[var(--primary)]/15 text-[var(--primary)] ring-1 ring-[var(--primary)]/30"
                : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
            }`}
          >
            {REACTION_EMOJIS[type as ReactionType]} {count}
          </button>
        ))}
      {/* Picker popup */}
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-[var(--surface-high)] rounded-xl p-1.5 shadow-lg border border-[var(--border)] z-20 animate-fade-in">
          {(Object.keys(REACTION_EMOJIS) as ReactionType[]).map((r) => (
            <button
              key={r}
              onClick={() => { onReact(r); setShowPicker(false); }}
              className={`text-lg px-1.5 py-0.5 rounded-lg hover:bg-[var(--surface-bright)] transition-transform hover:scale-125 ${
                userReaction === r ? "bg-[var(--primary)]/15" : ""
              }`}
              title={r}
            >
              {REACTION_EMOJIS[r]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Post composer ────────────────────────────────────
function PostComposer({ onPost, userProfile }: { onPost: () => void; userProfile?: PublicProfile | null }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"wings" | "public">("public");
  const [images, setImages] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const extractHashtags = (text: string) => [...text.matchAll(/#(\w+)/g)].map((m) => m[1]);
  const extractMentions = (text: string) => [...text.matchAll(/@(\w+)/g)].map((m) => m[1]);

  const handlePost = async () => {
    const plainText = editorRef.current?.innerText || content;
    const htmlContent = editorRef.current?.innerHTML || content;
    if (!plainText.trim()) return;
    setPosting(true);
    try {
      await createPostAction({
        content: htmlContent.trim(),
        visibility,
        postType: images.length > 0 ? "photo" : "text",
        images,
        hashtags: extractHashtags(plainText),
        mentions: extractMentions(plainText),
        linkedSessionId: null,
      });
      setContent("");
      setImages([]);
      if (editorRef.current) editorRef.current.innerHTML = "";
      setOpen(false);
      onPost();
    } finally {
      setPosting(false);
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) continue;
        const reader = new FileReader();
        const dataUrl: string = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const url = await uploadImageAction(dataUrl, "posts");
        if (url) setImages((prev) => [...prev, url]);
      }
    };
    input.click();
  };

  if (!open) {
    return (
      <Card className="!p-3 mb-4 cursor-pointer hover:bg-[var(--surface-bright)]/50 transition-colors" onClick={() => setOpen(true)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-[var(--primary)]">{userProfile?.firstName?.[0]?.toUpperCase() || "?"}</span>
          </div>
          <span className="text-sm text-[var(--outline)]">Partage quelque chose...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="!p-4 mb-4 ring-1 ring-[var(--primary)]/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-[var(--primary)]">{userProfile?.firstName?.[0]?.toUpperCase() || "?"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--on-surface)]">{userProfile?.firstName || "Toi"}</p>
        </div>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "wings" | "public")}
          className="text-[10px] bg-[var(--surface-high)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--on-surface-variant)]"
        >
          <option value="public">Public</option>
          <option value="wings">Wings only</option>
        </select>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 mb-2 pb-2 border-b border-[var(--border)]">
        {[
          { cmd: "bold", icon: "B", style: "font-bold" },
          { cmd: "italic", icon: "I", style: "italic" },
          { cmd: "underline", icon: "U", style: "underline" },
          { cmd: "strikeThrough", icon: "S", style: "line-through" },
        ].map((b) => (
          <button
            key={b.cmd}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); document.execCommand(b.cmd, false); editorRef.current?.focus(); }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] hover:text-[var(--primary)] transition-colors"
            title={b.cmd}
          >
            <span className={b.style}>{b.icon}</span>
          </button>
        ))}
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); document.execCommand("insertUnorderedList", false); editorRef.current?.focus(); }}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] hover:text-[var(--primary)] transition-colors"
          title="Liste"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
        </button>
      </div>

      {/* Rich editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[80px] max-h-[200px] overflow-y-auto text-sm text-[var(--on-surface)] outline-none mb-3 leading-relaxed empty:before:content-['Quoi_de_neuf_?_Utilise_#hashtags_et_@mentions...'] empty:before:text-[var(--outline)] break-words"
        onInput={() => setContent(editorRef.current?.innerText || "")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handlePost();
        }}
      />

      {/* Image preview */}
      {images.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {images.map((img, i) => (
            <div key={i} className="relative shrink-0">
              <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg" />
              <button
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[10px] text-[var(--outline)] hover:text-red-400"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hashtag / mention preview */}
      {(extractHashtags(content).length > 0 || extractMentions(content).length > 0) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {extractHashtags(content).map((h) => (
            <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">#{h}</span>
          ))}
          {extractMentions(content).map((m) => (
            <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--tertiary)]/10 text-[var(--tertiary)]">@{m}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <button onClick={handleImageUpload} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-colors" title="Photo">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setContent(""); setImages([]); if (editorRef.current) editorRef.current.innerHTML = ""; }}>Annuler</Button>
          <Button size="sm" onClick={handlePost} disabled={posting || !content.trim()}>
            {posting ? "..." : "Publier"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Comments section ─────────────────────────────────
function CommentsSection({
  itemType,
  itemId,
  commentCount,
}: {
  itemType: "session" | "post";
  itemId: string;
  commentCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<(SessionComment & { profile?: PublicProfile })[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = itemType === "session"
        ? await fetchSessionCommentsAction(itemId)
        : await fetchPostCommentsAction(itemId);
      const commenterIds = [...new Set(data.map((c: any) => c.userId))];
      if (commenterIds.length === 0) { setComments([]); return; }
      const profiles = await fetchProfilesByIdsAction(commenterIds);
      const profileMap: Record<string, PublicProfile> = {};
      profiles.forEach((p: PublicProfile) => { profileMap[p.userId] = p; });
      setComments(data.map((c: any) => ({ ...c, profile: profileMap[c.userId] })));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!expanded) loadComments();
    setExpanded(!expanded);
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;
    if (itemType === "session") {
      await addSessionCommentAction(itemId, newComment.trim());
    } else {
      await addPostCommentAction(itemId, newComment.trim());
    }
    setNewComment("");
    loadComments();
  };

  return (
    <div>
      <button onClick={handleToggle} className="flex items-center gap-1.5 text-[var(--outline)] hover:text-[var(--primary)] transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
        <span className="text-xs">{commentCount}</span>
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2 animate-fade-in">
          {loading ? (
            <div className="flex justify-center py-2"><div className="w-4 h-4 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>
          ) : comments.length === 0 ? (
            <p className="text-[10px] text-[var(--outline)] text-center py-2">Aucun commentaire</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className="w-6 h-6 rounded-md bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-[var(--primary)]">{c.profile?.firstName?.[0]?.toUpperCase() || "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--outline)]">{c.profile?.firstName || "Anonyme"} · {formatRelative(c.createdAt)}</p>
                  <p className="text-xs text-[var(--on-surface-variant)] break-words">{c.content}</p>
                </div>
              </div>
            ))
          )}
          <div className="flex gap-2 mt-2">
            <input
              ref={inputRef}
              placeholder="Commenter..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-[var(--surface-high)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
            />
            <Button size="sm" onClick={handleSend} disabled={!newComment.trim()}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Post actions menu ────────────────────────────────
function PostMenu({
  postId,
  isOwner,
  isPinned,
  onRefresh,
}: {
  postId: string;
  isOwner: boolean;
  isPinned: boolean;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleDelete = async () => { await deletePostAction(postId); setOpen(false); onRefresh(); };
  const handlePin = async () => { await togglePinPostAction(postId); setOpen(false); onRefresh(); };
  const handleHide = async () => { await hidePostAction(postId); setOpen(false); onRefresh(); };
  const handleReport = async () => {
    if (!reportReason.trim()) return;
    await reportPostAction(postId, reportReason.trim());
    setShowReport(false);
    setReportReason("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setOpen(!open)} className="p-1 rounded-md hover:bg-[var(--surface-bright)] text-[var(--outline)] transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl shadow-lg py-1 z-30 min-w-[140px] animate-fade-in">
          {isOwner && (
            <>
              <button onClick={handlePin} className="w-full text-left px-3 py-2 text-xs text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] transition-colors">
                {isPinned ? "Desepingler" : "Epingler"}
              </button>
              <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-[var(--surface-bright)] transition-colors">
                Supprimer
              </button>
            </>
          )}
          {!isOwner && (
            <>
              <button onClick={handleHide} className="w-full text-left px-3 py-2 text-xs text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] transition-colors">
                Masquer
              </button>
              <button onClick={() => setShowReport(true)} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-[var(--surface-bright)] transition-colors">
                Signaler
              </button>
            </>
          )}
        </div>
      )}
      <Modal open={showReport} onClose={() => setShowReport(false)} title="Signaler ce post">
        <textarea
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          placeholder="Raison du signalement..."
          rows={3}
          className="w-full bg-[var(--surface-high)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--on-surface)] placeholder:text-[var(--outline)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30 mb-4"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="danger" onClick={handleReport} disabled={!reportReason.trim()}>Signaler</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowReport(false)}>Annuler</Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Author header ────────────────────────────────────
function AuthorHeader({ profile, createdAt, badge, isPinned }: { profile: PublicProfile | null; createdAt: string; badge?: string; isPinned?: boolean }) {
  if (!profile) return null;
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 flex items-center justify-center">
        <span className="text-xs font-bold text-[var(--primary)]">{profile.firstName?.[0]?.toUpperCase() || "?"}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--on-surface)]">{profile.firstName || profile.username}</p>
        <p className="text-[10px] text-[var(--outline)]">@{profile.username}{profile.location ? ` · ${profile.location}` : ""}</p>
      </div>
      {isPinned && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--secondary)]/10 text-[var(--secondary)] flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2z" /></svg>
          Epingle
        </span>
      )}
      {badge && <Badge className="bg-[var(--tertiary)]/15 text-[var(--tertiary)]">{badge}</Badge>}
      <span className="text-[10px] text-[var(--outline)] shrink-0">{formatRelative(createdAt)}</span>
    </div>
  );
}

// ─── Share button ─────────────────────────────────────
function ShareButton({ title, text }: { title: string; text: string }) {
  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <button onClick={handleShare} className="p-1 text-[var(--outline)] hover:text-[var(--primary)] transition-colors" title="Partager">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg>
    </button>
  );
}

// ─── Render post content with hashtags/mentions + rich HTML ───
function RichContent({ text }: { text: string }) {
  // If content has HTML tags (from rich editor), render as HTML with hashtag/mention coloring
  const hasHtml = /<[a-z][\s\S]*>/i.test(text);
  if (hasHtml) {
    // Highlight hashtags and mentions within HTML
    const highlighted = text
      .replace(/(#\w+)/g, '<span style="color:var(--primary);font-weight:500">$1</span>')
      .replace(/(@\w+)/g, '<span style="color:var(--tertiary);font-weight:500">$1</span>');
    return (
      <div
        className="text-sm text-[var(--on-surface-variant)] leading-relaxed break-words [&_b]:font-bold [&_i]:italic [&_u]:underline [&_s]:line-through [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  }
  // Plain text fallback
  const parts = text.split(/(#\w+|@\w+)/g);
  return (
    <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.startsWith("#")) return <span key={i} className="text-[var(--primary)] font-medium">{part}</span>;
        if (part.startsWith("@")) return <span key={i} className="text-[var(--tertiary)] font-medium">{part}</span>;
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

// ─── Post type badge ──────────────────────────────────
const POST_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  session_share: { label: "Session", color: "bg-cyan-400/15 text-cyan-400", icon: "M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" },
  field_report: { label: "Field Report", color: "bg-[var(--secondary)]/15 text-[var(--secondary)]", icon: "M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586Z" },
  milestone: { label: "Milestone", color: "bg-emerald-400/15 text-emerald-400", icon: "M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 0 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 0 1-2.27.308 6.023 6.023 0 0 1-2.27-.308" },
  badge: { label: "Badge", color: "bg-amber-400/15 text-amber-400", icon: "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" },
};

// ═══════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════
export default function FeedPage() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const { wingProfiles } = useWingRequests();
  const wingIds = wingProfiles.map((w) => w.userId);

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [scope, setScope] = useState<FeedScope>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [myProfile, setMyProfile] = useState<PublicProfile | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const offsetRef = useRef(0);

  // Trending hashtags
  const trending = (() => {
    const counts: Record<string, number> = {};
    feed.forEach((item) => {
      if (item.type === "post" && item.data.hashtags) {
        (item.data.hashtags as string[]).forEach((h) => {
          counts[h] = (counts[h] || 0) + 1;
        });
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();

  // Load my profile
  useEffect(() => {
    if (!userId) return;
    fetchProfilesByIdsAction([userId]).then((profiles) => {
      if (profiles.length > 0) setMyProfile(profiles[0]);
    });
  }, [userId]);

  // Get user geolocation for proximity filtering (50km)
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, // silently fail — we'll show all posts if no location
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600_000 }
      );
    }
  }, []);

  // Load feed
  const loadFeed = useCallback(async (reset = true) => {
    if (!userId) return;
    if (reset) { setLoading(true); offsetRef.current = 0; }
    else setLoadingMore(true);

    try {
      const data = await fetchActivityFeedAction(wingIds, {
        scope,
        userLat: userPos?.lat,
        userLng: userPos?.lng,
        limit: PAGE_SIZE,
        offset: reset ? 0 : offsetRef.current,
      }) as FeedItem[];

      if (reset) {
        setFeed(data);
      } else {
        setFeed((prev) => [...prev, ...data]);
      }
      offsetRef.current = (reset ? 0 : offsetRef.current) + data.length;
      setHasMore(data.length >= PAGE_SIZE);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, wingIds.join(","), scope, userPos?.lat, userPos?.lng]);

  useEffect(() => { if (userId) loadFeed(true); }, [userId, wingProfiles.length, scope, userPos]);

  // Pull to refresh
  const pullStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { pullStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = async (e: React.TouchEvent) => {
    const pullDist = e.changedTouches[0].clientY - pullStartY.current;
    if (pullDist > 80 && feedRef.current && feedRef.current.scrollTop <= 0) {
      setRefreshing(true);
      await loadFeed(true);
      setRefreshing(false);
    }
  };

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;
      const scrollY = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollY >= docHeight - 400) loadFeed(false);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadFeed, loadingMore, hasMore]);

  // Session like handler
  const handleSessionLike = async (sessionId: string) => {
    await toggleSessionLikeAction(sessionId);
    loadFeed(true);
  };

  // Post reaction handler
  const handleReaction = async (postId: string, reaction: ReactionType) => {
    await togglePostReactionAction(postId, reaction);
    // Optimistic: reload
    loadFeed(true);
  };

  return (
    <div
      ref={feedRef}
      className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto animate-fade-in"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
          <span className="bg-gradient-to-r from-[#f472b6] to-[#818cf8] bg-clip-text text-transparent">Feed</span>
        </h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Partage et decouvre l&apos;activite de tes wings et de la communaute</p>
      </div>

      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="flex justify-center mb-4 animate-fade-in">
          <div className="w-6 h-6 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[var(--surface-high)] rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setScope(tab.key)}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all ${
              scope === tab.key
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trending hashtags */}
      {trending.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-[10px] text-[var(--outline)] shrink-0 font-medium uppercase tracking-wider">Tendances</span>
          {trending.map(([tag, count]) => (
            <span key={tag} className="shrink-0 text-[10px] px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium">
              #{tag} <span className="text-[var(--outline)]">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Post composer */}
      <PostComposer onPost={() => { toast.show("Post publié !"); loadFeed(true); }} userProfile={myProfile} />

      {/* Feed content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : feed.length === 0 ? (
        <EmptyState
          icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" /></svg>}
          title="Aucune activite"
          description={scope === "wings" ? "Tes wings n'ont encore rien partage." : "Personne n'a encore partage de contenu."}
        />
      ) : (
        <div className="space-y-4">
          {feed.map((item, idx) => (
            <div key={`${item.type}-${item.data.id}`} className="animate-slide-up" style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}>
              {/* ── SESSION ── */}
              {item.type === "session" && (
                <Card className="!p-4">
                  <AuthorHeader profile={item.profile} createdAt={item.createdAt} />
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-cyan-400/15 text-cyan-400">Session</Badge>
                      <p className="text-sm font-semibold text-[var(--on-surface)]">{item.data.title || "Session"}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--on-surface-variant)]">
                      {item.data.location && (
                        <span className="flex items-center gap-0.5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                          {item.data.location}
                        </span>
                      )}
                      <span>{item.data.interactionIds?.length || 0} approche{(item.data.interactionIds?.length || 0) > 1 ? "s" : ""}</span>
                    </div>
                    {item.data.notes && <p className="text-xs text-[var(--on-surface-variant)] mt-2 line-clamp-3">{item.data.notes}</p>}
                  </div>
                  <div className="flex items-center gap-4 pt-2 border-t border-[var(--border)]">
                    <button onClick={() => handleSessionLike(item.data.id)} className="flex items-center gap-1.5 text-[var(--outline)] hover:text-[var(--secondary)] transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
                      <span className="text-xs">{item.likeCount || 0}</span>
                    </button>
                    <CommentsSection itemType="session" itemId={item.data.id} commentCount={item.commentCount || 0} />
                    <div className="ml-auto">
                      <ShareButton title={item.data.title || "Session"} text={`${item.profile?.firstName || "Quelqu'un"} a fait une session : ${item.data.title || ""}${item.data.location ? ` a ${item.data.location}` : ""}`} />
                    </div>
                  </div>
                </Card>
              )}

              {/* ── JOURNAL ── */}
              {item.type === "journal" && (
                <Card className="!p-4">
                  <AuthorHeader profile={item.profile} createdAt={item.createdAt} badge={item.data.visibility === "wings" ? "Wings" : undefined} />
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-[var(--secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586Z" /></svg>
                    <span className="text-xs text-[var(--secondary)] font-medium">
                      {item.data.entryType === "fieldreport" ? "Field Report" : "Journal"}
                    </span>
                    {item.data.tag && <Badge className={JOURNAL_TAG_COLORS[item.data.tag as keyof typeof JOURNAL_TAG_COLORS]}>{JOURNAL_TAG_LABELS[item.data.tag as keyof typeof JOURNAL_TAG_LABELS]}</Badge>}
                  </div>
                  <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed line-clamp-5 whitespace-pre-wrap">{item.data.content}</p>
                  <div className="flex items-center gap-4 pt-2 mt-3 border-t border-[var(--border)]">
                    <ShareButton title="Journal" text={`${item.profile?.firstName || "Quelqu'un"} a partage une entree de journal`} />
                  </div>
                </Card>
              )}

              {/* ── POST ── */}
              {item.type === "post" && (
                <Card className={`!p-4 ${item.data.isPinned ? "ring-1 ring-[var(--secondary)]/20" : ""}`}>
                  <div className="flex items-start">
                    <div className="flex-1">
                      <AuthorHeader
                        profile={item.profile}
                        createdAt={item.createdAt}
                        badge={item.data.visibility === "wings" ? "Wings" : undefined}
                        isPinned={item.data.isPinned}
                      />
                    </div>
                    <PostMenu
                      postId={item.data.id}
                      isOwner={item.data.userId === userId}
                      isPinned={item.data.isPinned}
                      onRefresh={() => loadFeed(true)}
                    />
                  </div>

                  {/* Post type badge */}
                  {item.data.postType && item.data.postType !== "text" && item.data.postType !== "photo" && POST_TYPE_LABELS[item.data.postType] && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={POST_TYPE_LABELS[item.data.postType].icon} />
                      </svg>
                      <Badge className={POST_TYPE_LABELS[item.data.postType].color}>{POST_TYPE_LABELS[item.data.postType].label}</Badge>
                    </div>
                  )}

                  {/* Content */}
                  <RichContent text={item.data.content} />

                  {/* Images */}
                  {item.data.images && item.data.images.length > 0 && (
                    <div className={`mt-3 gap-2 ${item.data.images.length === 1 ? "flex" : "grid grid-cols-2"}`}>
                      {(item.data.images as string[]).map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt=""
                          className="rounded-xl object-cover w-full max-h-64"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}

                  {/* Hashtags */}
                  {item.data.hashtags && (item.data.hashtags as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(item.data.hashtags as string[]).map((h) => (
                        <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">#{h}</span>
                      ))}
                    </div>
                  )}

                  {/* Actions bar */}
                  <div className="flex items-center gap-3 pt-2 mt-3 border-t border-[var(--border)]">
                    <ReactionPicker
                      reactions={item.reactions || {}}
                      userReaction={item.userReaction || null}
                      onReact={(r) => handleReaction(item.data.id, r)}
                    />
                    <CommentsSection itemType="post" itemId={item.data.id} commentCount={item.commentCount || 0} />
                    <div className="ml-auto">
                      <ShareButton title="Post" text={item.data.content?.slice(0, 100) || ""} />
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ))}

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
            </div>
          )}

          {/* End of feed */}
          {!hasMore && feed.length > 0 && (
            <p className="text-center text-[10px] text-[var(--outline)] py-4">Fin du feed</p>
          )}
        </div>
      )}
    </div>
  );
}
