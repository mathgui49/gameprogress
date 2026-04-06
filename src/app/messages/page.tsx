"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useMessages } from "@/hooks/useMessages";
import { useWingRequests } from "@/hooks/useWingRequests";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { ProfileIncompleteNotice } from "@/components/ui/ProfileIncompleteNotice";
import { fetchWingStatusesAction, renameMessageGroupAction } from "@/actions/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PublicProfile, WingStatus, MessageGroup } from "@/types";
import { WING_STATUS_LABELS, WING_STATUS_COLORS } from "@/types";
import { formatRelative } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { Avatar } from "@/components/ui/Avatar";

type ChatTarget = { type: "dm"; userId: string } | { type: "group"; groupId: string };

export default function MessagesPage() {
  const { data: authSession } = useSession();
  const userId = authSession?.user?.email ?? "";
  const {
    conversations, groups, unreadCounts, currentMessages, loaded, totalUnread,
    openConversation, openGroupChat, send, createGroup, refresh,
  } = useMessages();
  const { wingProfiles } = useWingRequests();
  const { isProfileComplete } = usePublicProfile();

  const toast = useToast();
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [wingStatuses, setWingStatuses] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Create group modal
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Rename group modal
  const [showRenameGroup, setShowRenameGroup] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  const wingUserIds = useMemo(() => wingProfiles.map((p) => p.userId), [wingProfiles]);

  useEffect(() => {
    if (wingUserIds.length === 0) return;
    fetchWingStatusesAction(wingUserIds).then(setWingStatuses);
  }, [wingUserIds.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const getProfileFor = (uid: string): PublicProfile | undefined =>
    wingProfiles.find((p) => p.userId === uid);

  const handleOpenDm = (uid: string) => {
    setChatTarget({ type: "dm", userId: uid });
    openConversation(uid);
  };

  const handleOpenGroup = (groupId: string) => {
    setChatTarget({ type: "group", groupId });
    openGroupChat(groupId);
  };

  const handleSend = async () => {
    if (!chatInput.trim() || !chatTarget) return;
    const content = chatInput.trim();
    setChatInput("");
    let id: string | null = null;
    if (chatTarget.type === "dm") {
      id = await send(chatTarget.userId, null, content);
    } else {
      id = await send(null, chatTarget.groupId, content);
    }
    if (!id) {
      setChatInput(content); // restore on failure
      toast.show("Erreur lors de l'envoi du message", "error");
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    await createGroup(groupName, selectedMembers);
    setShowCreateGroup(false);
    setGroupName("");
    setSelectedMembers([]);
  };

  const getChatTitle = (): string => {
    if (!chatTarget) return "";
    if (chatTarget.type === "dm") {
      const p = getProfileFor(chatTarget.userId);
      return p?.firstName || p?.username || "Wing";
    }
    const group = groups.find((g) => g.id === chatTarget.groupId);
    if (group?.name) return group.name;
    // Default: list member names
    const memberNames = (group?.memberIds || [])
      .filter((id: string) => id !== userId)
      .map((id: string) => getProfileFor(id)?.firstName || "?")
      .join(", ");
    return memberNames || "Groupe";
  };

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>;

  if (!isProfileComplete) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#818cf8] to-[#67e8f9] bg-clip-text text-transparent">Messages</span>
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">Tes conversations</p>
        </div>
        <ProfileIncompleteNotice />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      {!chatTarget ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-[family-name:var(--font-grotesk)] font-bold tracking-tight mb-1">
                <span className="bg-gradient-to-r from-[#818cf8] to-[#67e8f9] bg-clip-text text-transparent">Messages</span>
              </h1>
              <p className="text-sm text-[var(--on-surface-variant)]">
                {totalUnread > 0 ? `${totalUnread} message${totalUnread > 1 ? "s" : ""} non lu${totalUnread > 1 ? "s" : ""}` : "Tes conversations"}
              </p>
            </div>
            <Button size="sm" onClick={() => setShowCreateGroup(true)}>+ Groupe</Button>
          </div>

          {/* Group chats */}
          {groups.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Groupes</p>
              <div className="space-y-2">
                {groups.map((group: MessageGroup) => {
                  const memberNames = group.memberIds
                    .filter((id: string) => id !== userId)
                    .slice(0, 3)
                    .map((id: string) => getProfileFor(id)?.firstName || "?")
                    .join(", ");
                  return (
                    <button key={group.id} onClick={() => handleOpenGroup(group.id)} className="w-full text-left">
                      <Card hover className="!p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-[var(--primary)]/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--on-surface)] truncate">{group.name || memberNames}</p>
                            <p className="text-[10px] text-[var(--outline)]">{group.memberIds.length} membres</p>
                          </div>
                        </div>
                      </Card>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DM conversations */}
          <div>
            <p className="text-xs font-medium text-[var(--on-surface-variant)] mb-2">Messages directs</p>
            {wingProfiles.length === 0 ? (
              <EmptyState
                icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>}
                title="Aucune conversation"
                description="Ajoute des wings pour commencer à discuter."
              />
            ) : (
              <div className="space-y-2">
                {wingProfiles.map((wing) => {
                  const lastConvo = conversations.find((c) => c.partnerId === wing.userId);
                  const unread = unreadCounts[wing.userId] || 0;
                  const status = wingStatuses[wing.userId] as WingStatus || "offline";
                  return (
                    <button key={wing.userId} onClick={() => handleOpenDm(wing.userId)} className="w-full text-left">
                      <Card hover className="!p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="md" />
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface)] ${WING_STATUS_COLORS[status]}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-semibold ${unread > 0 ? "text-[var(--on-surface)]" : "text-[var(--on-surface-variant)]"}`}>{wing.firstName || wing.username}</p>
                              {lastConvo && <span className="text-[10px] text-[var(--outline)]">{formatRelative(lastConvo.lastMessage.createdAt)}</span>}
                            </div>
                            <div className="flex items-center justify-between">
                              {lastConvo ? (
                                <p className={`text-xs truncate ${unread > 0 ? "text-[var(--on-surface)] font-medium" : "text-[var(--outline)]"}`}>{lastConvo.lastMessage.content}</p>
                              ) : (
                                <p className="text-xs text-[var(--outline)]">Aucun message</p>
                              )}
                              {unread > 0 && (
                                <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-medium shrink-0 ml-2">{unread}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Chat view */
        <div className="flex flex-col h-[calc(100vh-160px)]">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[var(--border)]">
            <button onClick={() => setChatTarget(null)} className="p-1 text-[var(--outline)] hover:text-[var(--on-surface)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            {chatTarget.type === "dm" ? (
              <>
                <div className="relative">
                  <Avatar src={getProfileFor(chatTarget.userId)?.profilePhoto} name={getProfileFor(chatTarget.userId)?.firstName} size="sm" className="!w-9 !h-9" />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface)] ${WING_STATUS_COLORS[(wingStatuses[chatTarget.userId] as WingStatus) || "offline"]}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--on-surface)]">{getChatTitle()}</p>
                  <p className="text-[10px] text-[var(--outline)]">{WING_STATUS_LABELS[(wingStatuses[chatTarget.userId] as WingStatus) || "offline"]}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400/20 to-[var(--primary)]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--on-surface)]">{getChatTitle()}</p>
                  <p className="text-[10px] text-[var(--outline)]">{groups.find((g) => g.id === chatTarget.groupId)?.memberIds.length || 0} membres</p>
                </div>
                {/* Rename button for group */}
                <button onClick={() => { setShowRenameGroup(chatTarget.groupId); setRenameInput(getChatTitle()); }} className="p-1.5 rounded-lg hover:bg-[var(--surface-bright)] text-[var(--outline)]" title="Renommer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                </button>
              </>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-2 px-1 mb-3">
            {[...currentMessages].reverse().map((msg) => {
              const isMe = msg.fromUserId === userId;
              const senderProfile = !isMe ? getProfileFor(msg.fromUserId) : null;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  {!isMe && chatTarget.type === "group" && (
                    <div className="mr-2 shrink-0 mt-1">
                      <Avatar src={senderProfile?.profilePhoto} name={senderProfile?.firstName} size="xs" />
                    </div>
                  )}
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    isMe
                      ? "bg-[var(--primary)] text-white rounded-br-md"
                      : "bg-[var(--surface-high)] text-[var(--on-surface)] rounded-bl-md"
                  }`}>
                    {!isMe && chatTarget.type === "group" && (
                      <p className={`text-[10px] font-medium mb-0.5 ${isMe ? "text-white/70" : "text-[var(--primary)]"}`}>{senderProfile?.firstName || "?"}</p>
                    )}
                    <p>{msg.content}</p>
                    <p className={`text-[9px] mt-1 ${isMe ? "text-white/60" : "text-[var(--outline)]"}`}>{formatRelative(msg.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message..."
              className="flex-1"
            />
            <Button onClick={handleSend}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
            </Button>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <Modal open={showCreateGroup} onClose={() => { setShowCreateGroup(false); setGroupName(""); setSelectedMembers([]); }} title="Nouveau groupe">
        <div className="space-y-3">
          <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nom du groupe..." />
          <p className="text-xs text-[var(--on-surface-variant)]">Sélectionne les membres</p>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {wingProfiles.map((wing) => (
              <button key={wing.userId}
                onClick={() => setSelectedMembers((prev) => prev.includes(wing.userId) ? prev.filter((id) => id !== wing.userId) : [...prev, wing.userId])}
                className={`w-full text-left flex items-center gap-3 p-2 rounded-lg transition-all ${selectedMembers.includes(wing.userId) ? "bg-[var(--primary)]/15 border border-[var(--primary)]/30" : "hover:bg-[var(--surface-bright)]"}`}>
                <Avatar src={wing.profilePhoto} name={wing.firstName || wing.username} size="sm" className="!w-7 !h-7" />
                <span className="text-xs text-[var(--on-surface)]">{wing.firstName || wing.username}</span>
                {selectedMembers.includes(wing.userId) && (
                  <svg className="w-4 h-4 text-[var(--primary)] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                )}
              </button>
            ))}
          </div>
          <Button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedMembers.length === 0}>Créer le groupe</Button>
        </div>
      </Modal>

      {/* Rename Group Modal */}
      <Modal open={!!showRenameGroup} onClose={() => setShowRenameGroup(null)} title="Renommer le groupe">
        <div className="space-y-3">
          <p className="text-xs text-[var(--on-surface-variant)]">Tous les membres du groupe peuvent renommer la discussion.</p>
          <Input value={renameInput} onChange={(e) => setRenameInput(e.target.value)} placeholder="Nouveau nom..." />
          <Button onClick={async () => {
            if (!renameInput.trim() || !showRenameGroup) return;
            await renameMessageGroupAction(showRenameGroup, renameInput.trim());
            refresh();
            setShowRenameGroup(null);
          }}>Renommer</Button>
        </div>
      </Modal>
    </div>
  );
}
