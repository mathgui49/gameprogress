"use client";

import { useState } from "react";
import { useMissions } from "@/hooks/useMissions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export default function MissionsPage() {
  const { missions, active, completed, loaded, add, progress, remove } = useMissions();
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("3");

  if (!loaded) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#85adff]/30 border-t-[#85adff] rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Missions</h1>
          <p className="text-sm text-[#adaaab]">{active.length} active{active.length > 1 ? "s" : ""}, {completed.length} terminee{completed.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ Mission</Button>
      </div>

      {missions.length === 0 ? (
        <EmptyState icon="🎯" title="Aucune mission" description="Cree ta premiere mission pour commencer a gagner de l'XP." action={<Button onClick={() => setShowNew(true)}>Creer une mission</Button>} />
      ) : (
        <>
          {/* Active */}
          {active.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-[#adaaab] uppercase tracking-wider mb-3">En cours</h2>
              <div className="space-y-3">
                {active.map((m) => {
                  const pct = Math.min((m.current / m.target) * 100, 100);
                  return (
                    <Card key={m.id} className="!p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-white">{m.title}</p>
                            <Badge className={m.type === "daily" ? "bg-[#85adff]/15 text-[#85adff]" : m.type === "weekly" ? "bg-[#ac8aff]/15 text-[#ac8aff]" : "bg-[#262627] text-[#adaaab]"}>
                              {m.type === "daily" ? "Quotidien" : m.type === "weekly" ? "Hebdo" : "Custom"}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#484849]">{m.description}</p>
                        </div>
                        <span className="text-xs font-semibold text-[#85adff]">+{m.xpReward} XP</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#85adff] to-[#ac8aff] transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-[#adaaab] w-12 text-right">{m.current}/{m.target}</span>
                        <Button variant="secondary" size="sm" onClick={() => progress(m.id)}>+1</Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[#adaaab] uppercase tracking-wider mb-3">Terminees</h2>
              <div className="space-y-2">
                {completed.map((m) => (
                  <Card key={m.id} className="!p-4 opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400">✓</span>
                        <p className="text-sm text-white">{m.title}</p>
                      </div>
                      <span className="text-xs text-emerald-400">+{m.xpReward} XP</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* New mission modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nouvelle mission">
        <div className="space-y-4">
          <Input label="Titre" placeholder="Ex: 3 interactions aujourd'hui" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Description" placeholder="Description optionnelle" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Input label="Objectif (nombre)" type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
          <Button disabled={!title.trim()} onClick={() => { add(title, desc, "custom", Number(target) || 3, 20); setTitle(""); setDesc(""); setTarget("3"); setShowNew(false); }}>
            Creer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
