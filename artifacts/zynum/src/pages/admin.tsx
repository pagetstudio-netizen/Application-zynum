import React, { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Users, ShoppingBag, CreditCard, MessageSquare,
  Settings, HelpCircle, Share2, Globe2, TrendingUp, Wallet,
  Zap, Shield, Plus, Trash2, Edit3, Ban, Check, CheckCircle,
  Search, ChevronLeft, ChevronRight, RefreshCw, Send,
  ToggleLeft, ToggleRight, DollarSign, Percent, Star,
  Package, AlertTriangle, Clock, Database, Bell, Eye, EyeOff, Key, Mail, Loader2,
  Image as ImageIcon, X, Bitcoin, Copy, ExternalLink, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const API = "/api";

const n = (v: unknown): number => Number(v) || 0;

function useAdminFetch<T>(endpoint: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    setLoading(true);
    const token = localStorage.getItem("zynum_token") ?? "";
    fetch(`${API}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Erreur de chargement"); setLoading(false); });
  };

  useEffect(refetch, deps);
  return { data, loading, error, refetch };
}

async function adminPost(endpoint: string, body: unknown) {
  const token = localStorage.getItem("zynum_token") ?? "";
  const r = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function adminPatch(endpoint: string, body: unknown) {
  const token = localStorage.getItem("zynum_token") ?? "";
  const r = await fetch(`${API}${endpoint}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function adminDelete(endpoint: string) {
  const token = localStorage.getItem("zynum_token") ?? "";
  const r = await fetch(`${API}${endpoint}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.json();
}

/* ─── STAT CARD ────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/40 p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold text-white truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── TABLE WRAPPER ─────────────────────────────────────────────────────── */
function Table({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            {headers.map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {empty
            ? <tr><td colSpan={headers.length} className="text-center py-12 text-muted-foreground text-sm">Aucun résultat</td></tr>
            : children}
        </tbody>
      </table>
    </div>
  );
}

/* ─── PAGINATION ────────────────────────────────────────────────────────── */
function Pagination({ page, total, limit, onChange }: { page: number; total: number; limit: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
      <span>{total} résultats — page {page}/{pages}</span>
      <div className="flex gap-2">
        <button disabled={page === 1} onClick={() => onChange(page - 1)} className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
        <button disabled={page === pages} onClick={() => onChange(page + 1)} className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

/* ─── STATUS BADGE ──────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    RECEIVED: "bg-green-500/20 text-green-400 border-green-500/30",
    FINISHED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    TIMEOUT: "bg-gray-500/20 text-gray-400",
    BANNED: "bg-red-500/20 text-red-400",
    CANCELED: "bg-gray-500/20 text-gray-400",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    pending: "bg-yellow-500/20 text-yellow-400",
    failed: "bg-red-500/20 text-red-400",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] ?? "bg-gray-500/20 text-gray-400"}`}>{status}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: STATS DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
function AdminStats() {
  const { toast } = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [queryStr, setQueryStr] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { data, loading, refetch } = useAdminFetch<any>(`/v1/admin/stats${queryStr}`, [queryStr]);

  const applyDates = () => setQueryStr(from || to ? `?from=${from}&to=${to}` : "");
  const s = data ?? {};

  const handleResetMyStats = async () => {
    setResetting(true);
    try {
      const token = localStorage.getItem("zynum_token") ?? "";
      const r = await fetch(`${API}/v1/admin/reset-my-stats`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) {
        toast({ title: "Compteurs réinitialisés", description: "Les statistiques repartent de zéro. Aucune donnée supprimée." });
        refetch();
      } else {
        toast({ variant: "destructive", title: "Erreur", description: d.error ?? "Échec de la réinitialisation" });
      }
    } catch {
      toast({ variant: "destructive", title: "Erreur réseau" });
    } finally { setResetting(false); setResetConfirm(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Du</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Au</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
          </div>
          <Button onClick={applyDates} className="bg-primary hover:bg-primary/90 text-white">Filtrer</Button>
          <Button variant="outline" onClick={() => { setFrom(""); setTo(""); setQueryStr(""); }} className="border-white/10 text-white hover:bg-white/5">Reset</Button>
          <button onClick={refetch} className="p-2 rounded-xl border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5"><RefreshCw className="w-4 h-4" /></button>
        </div>
        {/* Reset mes stats */}
        {!resetConfirm ? (
          <Button onClick={() => setResetConfirm(true)} variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 text-xs h-8 px-3">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Réinitialiser les compteurs
          </Button>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <p className="text-xs text-amber-400">Les compteurs repartent à 0 — aucune donnée supprimée.</p>
            <Button onClick={handleResetMyStats} disabled={resetting} className="bg-amber-600 hover:bg-amber-500 text-white h-7 px-2 text-xs">
              {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmer"}
            </Button>
            <button onClick={() => setResetConfirm(false)} className="text-xs text-muted-foreground hover:text-white">Annuler</button>
          </div>
        )}
      </div>

      {s.statsResetAt && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400">
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          Compteurs réinitialisés le {new Date(s.statsResetAt).toLocaleString("fr-FR")} — les données antérieures sont conservées.
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Utilisateurs total" value={s.users?.total ?? 0} sub={`${s.users?.newToday ?? 0} nouveaux aujourd'hui`} icon={<Users className="w-6 h-6 text-blue-400" />} color="bg-blue-500/20" />
            <StatCard label="Utilisateurs actifs" value={s.users?.active ?? 0} sub={`${s.users?.banned ?? 0} bannis`} icon={<Shield className="w-6 h-6 text-green-400" />} color="bg-green-500/20" />
            <StatCard label="Nouveaux ce mois" value={s.users?.newMonth ?? 0} icon={<TrendingUp className="w-6 h-6 text-cyan-400" />} color="bg-cyan-500/20" />
            <StatCard label="Soldes totaux" value={`$${n(s.revenue?.totalUsd).toFixed(2)}`} sub="Revenus totaux" icon={<Wallet className="w-6 h-6 text-primary" />} color="bg-primary/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Commandes total" value={s.orders?.total ?? 0} sub={`${s.orders?.completed ?? 0} complétées`} icon={<Package className="w-6 h-6 text-orange-400" />} color="bg-orange-500/20" />
            <StatCard label="Commandes aujourd'hui" value={s.orders?.today?.count ?? 0} sub={`$${n(s.orders?.today?.revenueUsd).toFixed(2)} générés`} icon={<Zap className="w-6 h-6 text-yellow-400" />} color="bg-yellow-500/20" />
            <StatCard label="Commandes ce mois" value={s.orders?.month?.count ?? 0} sub={`$${n(s.orders?.month?.revenueUsd).toFixed(2)} générés`} icon={<BarChart3 className="w-6 h-6 text-purple-400" />} color="bg-purple-500/20" />
            <StatCard label="Commandes cette année" value={s.orders?.year?.count ?? 0} sub={`$${n(s.orders?.year?.revenueUsd).toFixed(2)} générés`} icon={<Star className="w-6 h-6 text-pink-400" />} color="bg-pink-500/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Revenus USD total" value={`$${n(s.revenue?.totalUsd).toFixed(2)}`} icon={<DollarSign className="w-6 h-6 text-green-400" />} color="bg-green-500/20" />
            <StatCard label="Revenus FCFA total" value={`${Math.round(n(s.revenue?.totalFcfa)).toLocaleString()} F`} icon={<DollarSign className="w-6 h-6 text-green-400" />} color="bg-green-500/20" />
            <StatCard label="Rechargements total" value={`$${n(s.revenue?.totalRechargeUsd).toFixed(2)}`} icon={<CreditCard className="w-6 h-6 text-blue-400" />} color="bg-blue-500/20" />
            <StatCard label="Transactions" value={s.transactions?.total ?? 0} icon={<Database className="w-6 h-6 text-muted-foreground" />} color="bg-white/10" />
          </div>
          {queryStr && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard label="Commandes (période)" value={s.orders?.range?.count ?? 0} icon={<Clock className="w-6 h-6 text-cyan-400" />} color="bg-cyan-500/20" />
              <StatCard label="Revenus (période)" value={`$${n(s.orders?.range?.revenueUsd).toFixed(2)}`} icon={<TrendingUp className="w-6 h-6 text-primary" />} color="bg-primary/20" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-card/40 p-5">
              <h3 className="font-semibold text-white mb-4">Top services</h3>
              <div className="space-y-2">
                {(s.topServices ?? []).map((sv: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-white">{sv.service || "?"}</span>
                    <span className="text-sm font-bold text-primary">{sv.c} commandes</span>
                  </div>
                ))}
                {!(s.topServices?.length) && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-card/40 p-5">
              <h3 className="font-semibold text-white mb-4">Top pays</h3>
              <div className="space-y-2">
                {(s.topCountries ?? []).map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-white">{c.country || "?"}</span>
                    <span className="text-sm font-bold text-primary">{c.c} commandes</span>
                  </div>
                ))}
                {!(s.topCountries?.length) && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: USERS
══════════════════════════════════════════════════════════════════════════════ */
function AdminUsers() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const queryStr = `/v1/admin/users?q=${search}&page=${page}&limit=15`;
  const { data, loading, refetch } = useAdminFetch<any>(queryStr, [search, page]);

  const { data: userDetail, loading: detailLoading, refetch: refetchDetail } = useAdminFetch<any>(
    selectedUser ? `/v1/admin/users/${selectedUser.id}` : "",
    [selectedUser?.id]
  );

  const handleSearch = () => { setSearch(q); setPage(1); };
  const openEdit = (u: any) => { setEditData({ name: u.name, email: u.email, balanceUsd: u.balanceUsd, isAdmin: u.isAdmin, isBanned: u.isBanned, password: "" }); setShowEdit(true); };
  const saveEdit = async () => {
    const payload: any = { name: editData.name, email: editData.email, balanceUsd: parseFloat(editData.balanceUsd), isAdmin: editData.isAdmin, isBanned: editData.isBanned };
    if (editData.password) payload.password = editData.password;
    await adminPatch(`/v1/admin/users/${selectedUser.id}`, payload);
    toast({ title: "Utilisateur mis à jour" });
    setShowEdit(false);
    refetch();
    refetchDetail();
  };
  const toggleBan = async (u: any) => {
    await adminPatch(`/v1/admin/users/${u.id}`, { isBanned: !u.isBanned });
    toast({ title: u.isBanned ? "Compte réactivé" : "Compte banni" });
    refetch();
    if (selectedUser?.id === u.id) refetchDetail();
  };
  const toggleAdmin = async (u: any) => {
    await adminPatch(`/v1/admin/users/${u.id}`, { isAdmin: !u.isAdmin });
    toast({ title: u.isAdmin ? "Droits admin retirés" : `${u.name} est maintenant administrateur` });
    refetch();
    if (selectedUser?.id === u.id) refetchDetail();
  };

  if (selectedUser && userDetail) {
    const u = userDetail.user;
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedUser(null)} className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
          <h2 className="text-lg font-bold text-white">Profil utilisateur</h2>
          <div className="ml-auto flex gap-2">
            <Button onClick={() => openEdit(u)} size="sm" className="bg-primary hover:bg-primary/90 text-white"><Edit3 className="w-3.5 h-3.5 mr-1" /> Modifier</Button>
            <Button onClick={() => toggleAdmin(u)} size="sm" variant="outline" className={`border-white/10 ${u.isAdmin ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-white/5"}`}>
              <Shield className="w-3.5 h-3.5 mr-1" /> {u.isAdmin ? "Retirer admin" : "Rendre admin"}
            </Button>
            <Button onClick={() => toggleBan(u)} size="sm" variant="outline" className={`border-white/10 ${u.isBanned ? "text-green-400 hover:bg-green-500/10" : "text-red-400 hover:bg-red-500/10"}`}>
              <Ban className="w-3.5 h-3.5 mr-1" /> {u.isBanned ? "Débannir" : "Bannir"}
            </Button>
          </div>
        </div>

        {showEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-card rounded-2xl border border-white/10 p-6 w-full max-w-md space-y-4">
              <h3 className="font-bold text-white text-lg">Modifier l'utilisateur</h3>
              {["name", "email"].map((f) => (
                <div key={f}>
                  <label className="text-xs text-muted-foreground block mb-1 capitalize">{f}</label>
                  <input value={editData[f] ?? ""} onChange={(e) => setEditData({ ...editData, [f]: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Solde (USD)</label>
                <input type="number" step="0.01" value={editData.balanceUsd ?? 0} onChange={(e) => setEditData({ ...editData, balanceUsd: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Nouveau mot de passe (laisser vide = pas de changement)</label>
                <input type="password" value={editData.password ?? ""} onChange={(e) => setEditData({ ...editData, password: e.target.value })} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-white">
                  <input type="checkbox" checked={editData.isAdmin ?? false} onChange={(e) => setEditData({ ...editData, isAdmin: e.target.checked })} /> Admin
                </label>
                <label className="flex items-center gap-2 text-sm text-white">
                  <input type="checkbox" checked={editData.isBanned ?? false} onChange={(e) => setEditData({ ...editData, isBanned: e.target.checked })} /> Banni
                </label>
              </div>
              <div className="flex gap-3 mt-2">
                <Button onClick={saveEdit} className="flex-1 bg-primary hover:bg-primary/90 text-white">Sauvegarder</Button>
                <Button onClick={() => setShowEdit(false)} variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">Annuler</Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-card/40 p-5 space-y-3">
            <h3 className="font-semibold text-white">Informations</h3>
            {[["ID", u.id], ["Nom", u.name], ["Email", u.email], ["Solde", `$${n(u.balanceUsd).toFixed(2)}`], ["Créé le", new Date(u.createdAt).toLocaleString("fr")]].map(([l, v]) => (
              <div key={l as string} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{l}</span>
                <span className="text-white font-medium">{v as string}</span>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              {u.isAdmin && <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold border border-primary/30">Admin</span>}
              {u.isBanned && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">Banni</span>}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card/40 p-5 space-y-2">
            <h3 className="font-semibold text-white">Résumé activité</h3>
            <p className="text-sm text-muted-foreground">{userDetail.orders?.length ?? 0} commandes</p>
            <p className="text-sm text-muted-foreground">{userDetail.transactions?.length ?? 0} transactions</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10"><h3 className="font-semibold text-white">Historique des numéros</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 bg-white/5">{["Service", "Pays", "Numéro", "Statut", "Prix", "Date"].map((h) => <th key={h} className="text-left px-4 py-2 text-xs text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {(userDetail.orders ?? []).map((o: any) => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-white font-medium">{o.serviceName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{o.countryName}</td>
                    <td className="px-4 py-2.5 text-white font-mono text-xs">{o.phone}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-2.5 text-white">${n(o.priceUsd).toFixed(3)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleString("fr")}</td>
                  </tr>
                ))}
                {!userDetail.orders?.length && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Aucune commande</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 flex gap-2 min-w-64">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="Rechercher nom, email..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-muted-foreground" />
          <Button onClick={handleSearch} className="bg-primary hover:bg-primary/90 text-white px-3"><Search className="w-4 h-4" /></Button>
        </div>
        <button onClick={refetch} className="p-2 rounded-xl border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          <Table headers={["ID", "Nom", "Email", "Solde", "Statut", "Date", "Actions"]} empty={!data?.users?.length}>
            {(data?.users ?? []).map((u: any) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-muted-foreground text-xs">#{u.id}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <p className="text-white font-medium text-sm">{u.name}</p>
                      {u.isAdmin && <span className="text-[10px] text-primary font-bold">ADMIN</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-sm">{u.email}</td>
                <td className="px-4 py-3 text-white font-semibold text-sm">${n(u.balanceUsd).toFixed(2)}</td>
                <td className="px-4 py-3">{u.isBanned ? <StatusBadge status="BANNED" /> : <StatusBadge status="RECEIVED" />}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString("fr")}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedUser(u)} className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10" title="Voir"><Search className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setSelectedUser(u); openEdit(u); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" title="Modifier"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleAdmin(u)} className={`p-1.5 rounded-lg ${u.isAdmin ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`} title={u.isAdmin ? "Retirer admin" : "Rendre admin"}><Shield className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleBan(u)} className={`p-1.5 rounded-lg ${u.isBanned ? "text-green-400 hover:bg-green-500/10" : "text-red-400 hover:bg-red-500/10"}`} title={u.isBanned ? "Débannir" : "Bannir"}><Ban className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <Pagination page={page} total={data?.total ?? 0} limit={15} onChange={setPage} />
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: ORDERS
══════════════════════════════════════════════════════════════════════════════ */
function AdminOrders() {
  const [page, setPage] = useState(1);
  const { data, loading, refetch } = useAdminFetch<any>(`/v1/admin/orders?page=${page}&limit=20`, [page]);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={refetch} className="p-2 rounded-xl border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          <Table headers={["ID", "Utilisateur", "Service", "Pays", "Numéro", "Statut", "Prix", "Date"]} empty={!data?.orders?.length}>
            {(data?.orders ?? []).map((o: any) => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-muted-foreground text-xs">#{o.id}</td>
                <td className="px-4 py-3"><div><p className="text-white text-sm">{o.userName}</p><p className="text-xs text-muted-foreground">{o.userEmail}</p></div></td>
                <td className="px-4 py-3 text-white text-sm">{o.service}</td>
                <td className="px-4 py-3 text-muted-foreground text-sm">{o.country}</td>
                <td className="px-4 py-3 text-white font-mono text-xs">{o.phone}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-white text-sm">${n(o.priceUsd).toFixed(3)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleString("fr")}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={page} total={data?.total ?? 0} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: TRANSACTIONS
══════════════════════════════════════════════════════════════════════════════ */
const emptyDepositForm = { userId: "", amountUsd: "", method: "orange_money", provider: "", type: "recharge", status: "completed", reference: "", note: "" };

function AdminTransactions() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositForm, setDepositForm] = useState({ ...emptyDepositForm });
  const [depositSaving, setDepositSaving] = useState(false);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (q) params.set("q", q);
  if (statusFilter) params.set("status", statusFilter);
  if (typeFilter) params.set("type", typeFilter);

  const { data: usersData } = useAdminFetch<any>("/v1/admin/users?limit=100", []);
  const { data, loading, refetch } = useAdminFetch<any>(`/v1/admin/transactions?${params}`, [page, q, statusFilter, typeFilter]);

  const applySearch = () => { setQ(qInput); setPage(1); };
  const clearFilters = () => { setQ(""); setQInput(""); setStatusFilter(""); setTypeFilter(""); setPage(1); };
  const hasFilters = q || statusFilter || typeFilter;

  const handleDeposit = async () => {
    if (!depositForm.userId || !depositForm.amountUsd) return;
    setDepositSaving(true);
    const res = await adminPost("/v1/admin/transactions", depositForm);
    if (res.success) {
      toast({ title: "Transaction créée avec succès" });
      setDepositForm({ ...emptyDepositForm });
      setShowDepositForm(false);
      refetch();
    } else {
      toast({ variant: "destructive", title: "Erreur", description: res.error });
    }
    setDepositSaving(false);
  };

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50";
  const selClass = "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50";

  return (
    <div className="space-y-5">
      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-card/40 p-4 text-center">
            <p className="text-2xl font-bold text-white">{data.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Transactions{hasFilters ? " (filtrées)" : ""}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-card/40 p-4 text-center">
            <p className="text-2xl font-bold text-primary">${n(data.totalRevenue).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Volume USD</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-card/40 p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold text-white">{Math.round(n(data.totalRevenue) * 620).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Volume FCFA</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="rounded-2xl border border-white/10 bg-card/40 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="flex flex-1 min-w-[200px] items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="Email, nom, référence..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none"
            />
            {qInput && (
              <button onClick={() => { setQInput(""); setQ(""); setPage(1); }} className="text-muted-foreground hover:text-white">
                <AlertTriangle className="w-3 h-3" />
              </button>
            )}
          </div>
          <button onClick={applySearch} className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-xl text-sm text-primary font-medium hover:bg-primary/30 transition-colors">
            Rechercher
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Status filter */}
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selClass}>
            <option value="">Tous les statuts</option>
            <option value="completed">Complétées</option>
            <option value="pending">En attente</option>
            <option value="failed">Échouées</option>
          </select>

          {/* Type filter */}
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className={selClass}>
            <option value="">Tous les types</option>
            <option value="recharge">Recharge</option>
            <option value="debit">Débit</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors">
              Réinitialiser
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowDepositForm(!showDepositForm)}
              className="flex items-center gap-2 px-3 py-2 bg-green-500/15 border border-green-500/30 rounded-xl text-sm text-green-400 font-medium hover:bg-green-500/25 transition-colors"
            >
              <Plus className="w-4 h-4" /> Dépôt manuel
            </button>
            <button onClick={refetch} className="p-2 rounded-xl border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual deposit form */}
      <AnimatePresence>
        {showDepositForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 space-y-4"
          >
            <h3 className="font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" /> Créer un dépôt manuel
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Utilisateur *</label>
                <select value={depositForm.userId} onChange={(e) => setDepositForm({ ...depositForm, userId: e.target.value })} className={inp}>
                  <option value="">Sélectionner un utilisateur</option>
                  {(usersData?.users ?? []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.email} — ${n(u.balanceUsd).toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Montant USD *</label>
                <input type="number" step="0.01" value={depositForm.amountUsd} onChange={(e) => setDepositForm({ ...depositForm, amountUsd: e.target.value })} placeholder="ex: 5.00" className={inp} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Type</label>
                <select value={depositForm.type} onChange={(e) => setDepositForm({ ...depositForm, type: e.target.value })} className={inp}>
                  <option value="recharge">Recharge (crédit)</option>
                  <option value="debit">Débit</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Méthode *</label>
                <select value={depositForm.method} onChange={(e) => setDepositForm({ ...depositForm, method: e.target.value })} className={inp}>
                  <option value="orange_money">Orange Money</option>
                  <option value="moov_money">Moov Money</option>
                  <option value="wave">Wave</option>
                  <option value="mtn_momo">MTN MoMo</option>
                  <option value="omnipay">OmniPay</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Virement bancaire</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Statut</label>
                <select value={depositForm.status} onChange={(e) => setDepositForm({ ...depositForm, status: e.target.value })} className={inp}>
                  <option value="completed">Complétée</option>
                  <option value="pending">En attente</option>
                  <option value="failed">Échouée</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Référence</label>
                <input value={depositForm.reference} onChange={(e) => setDepositForm({ ...depositForm, reference: e.target.value })} placeholder="Ref. optionnelle" className={inp} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Note interne</label>
              <input value={depositForm.note} onChange={(e) => setDepositForm({ ...depositForm, note: e.target.value })} placeholder="Raison du dépôt..." className={inp} />
            </div>
            {depositForm.amountUsd && (
              <div className="text-sm text-green-400/80 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2">
                ≈ {Math.round(parseFloat(depositForm.amountUsd || "0") * 620).toLocaleString()} FCFA
                {depositForm.type === "debit" ? " sera débité" : " sera crédité"} sur le solde
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={handleDeposit} disabled={depositSaving || !depositForm.userId || !depositForm.amountUsd} className="bg-green-600 hover:bg-green-500 text-white">
                <CheckCircle className="w-4 h-4 mr-2" /> {depositSaving ? "Traitement..." : "Valider le dépôt"}
              </Button>
              <Button variant="outline" onClick={() => setShowDepositForm(false)} className="border-white/10 text-white hover:bg-white/5">
                Annuler
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-card/40 overflow-hidden">
            {!data?.transactions?.length ? (
              <div className="py-16 text-center">
                <Database className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {hasFilters ? "Aucune transaction ne correspond aux filtres" : "Aucune transaction enregistrée"}
                </p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-3 text-xs text-primary hover:underline">Réinitialiser les filtres</button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      {["ID", "Utilisateur", "Type", "Méthode", "Montant", "Statut", "Référence", "Date"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.transactions ?? []).map((t: any) => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">#{t.id}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white text-sm font-medium">{t.userName ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{t.userEmail ?? "—"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${t.type === "recharge" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                            {t.type === "recharge" ? "Recharge" : "Débit"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm capitalize">
                          {t.method}{t.provider && t.provider !== t.method ? <span className="text-muted-foreground/50"> • {t.provider}</span> : ""}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white font-semibold text-sm">${n(t.amountUsd).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{Math.round(n(t.amountFcfa)).toLocaleString()} FCFA</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-3 max-w-[150px]">
                          {t.reference ? (
                            <div className="flex items-center gap-1.5 group">
                              <span className="text-muted-foreground text-xs font-mono truncate" title={t.reference}>{t.reference}</span>
                              <button
                                onClick={() => { navigator.clipboard.writeText(t.reference); toast({ title: "Référence copiée", description: t.reference }); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white flex-shrink-0"
                                title="Copier la référence"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                              </button>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(t.createdAt).toLocaleString("fr")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {(data?.total ?? 0) > 20 && <Pagination page={page} total={data?.total ?? 0} limit={20} onChange={setPage} />}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: MESSAGES
══════════════════════════════════════════════════════════════════════════════ */
const POPUP_COLORS = [
  { value: "blue",   label: "Bleu",    dot: "bg-blue-500" },
  { value: "green",  label: "Vert",    dot: "bg-green-500" },
  { value: "red",    label: "Rouge",   dot: "bg-red-500" },
  { value: "yellow", label: "Jaune",   dot: "bg-yellow-400" },
  { value: "purple", label: "Violet",  dot: "bg-purple-500" },
  { value: "orange", label: "Orange",  dot: "bg-orange-500" },
];

const NOTIF_TYPES = [
  { value: "popup", label: "Icône + Message", icon: "🔔", desc: "Notification avec icône colorée et texte" },
  { value: "image", label: "Image seule",     icon: "🖼️", desc: "Image plein-écran avec lien optionnel" },
  { value: "text",  label: "Texte simple",    icon: "💬", desc: "Message texte sans icône" },
];

const emptyForm = { displayType: "popup", target: "all", subject: "", content: "", color: "blue", linkUrl: "", linkLabel: "", imageUrl: "" };

function AdminMessages() {
  const { toast } = useToast();
  const { data, loading, refetch } = useAdminFetch<any>("/v1/admin/messages", []);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const isImage = form.displayType === "image";
  const isText  = form.displayType === "text";
  const canCreate = isImage ? !!form.imageUrl.trim() : !!form.content.trim();

  const handleCreate = async () => {
    if (!canCreate) return;
    setSaving(true);
    const res = await adminPost("/v1/admin/messages", {
      type: form.displayType,
      target: form.target,
      subject: form.subject || null,
      content: form.content || null,
      color: form.color,
      linkUrl: form.linkUrl || null,
      linkLabel: form.linkLabel || null,
      imageUrl: form.imageUrl || null,
    });
    if (res.success) {
      toast({ title: "Notification créée" });
      setForm({ ...emptyForm });
      refetch();
    } else {
      toast({ variant: "destructive", title: "Erreur", description: res.error });
    }
    setSaving(false);
  };

  const handleToggle = async (m: any) => {
    setToggling(m.id);
    await adminPatch(`/v1/admin/messages/${m.id}`, { isActive: !m.isActive });
    refetch();
    setToggling(null);
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    await adminDelete(`/v1/admin/messages/${id}`);
    toast({ title: "Notification supprimée" });
    refetch();
    setDeleting(null);
  };

  const allNotifs = data?.messages ?? [];
  const activeCount = allNotifs.filter((m: any) => m.isActive).length;

  const TYPE_LABELS: Record<string, string> = { popup: "Icône", image: "Image", text: "Texte" };
  const TYPE_DOTS: Record<string, string> = { popup: "bg-blue-500", image: "bg-purple-500", text: "bg-gray-500" };

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-card/40 p-4 text-center">
          <p className="text-2xl font-bold text-white">{allNotifs.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Notifications</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/40 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Actives</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/40 p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{allNotifs.length - activeCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Inactives</p>
        </div>
      </div>

      {/* Create form */}
      <div className="rounded-2xl border border-white/10 bg-card/40 p-6 space-y-5">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Créer une notification
        </h3>

        {/* Type selector */}
        <div>
          <label className="text-xs text-muted-foreground block mb-2">Type de notification</label>
          <div className="grid grid-cols-3 gap-2">
            {NOTIF_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setForm({ ...emptyForm, displayType: t.value })}
                className={`rounded-xl border p-3 text-center transition-all ${form.displayType === t.value ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:bg-white/8"}`}
              >
                <div className="text-xl mb-1">{t.icon}</div>
                <p className={`text-xs font-semibold leading-tight ${form.displayType === t.value ? "text-primary" : "text-white"}`}>{t.label}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{NOTIF_TYPES.find(t => t.value === form.displayType)?.desc}</p>
        </div>

        {/* Image URL — only for image type */}
        {isImage && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">URL de l'image *</label>
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://exemple.com/image.jpg" className={inp} />
          </div>
        )}

        {/* Subject — not for text-only */}
        <div className={isImage ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Titre {isImage ? "(optionnel)" : "(optionnel)"}</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Titre de la notification" className={inp} />
          </div>
          {!isImage && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Couleur / icône</label>
              <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className={inp}>
                {POPUP_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Content — not required for image */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Message {isImage ? "(optionnel)" : "*"}</label>
          <textarea rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder={isImage ? "Légende de l'image (optionnel)..." : "Contenu de la notification..."} className={`${inp} resize-none`} />
        </div>

        {/* Link fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Lien URL (optionnel)</label>
            <input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://..." className={inp} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Texte du bouton</label>
            <input value={form.linkLabel} onChange={(e) => setForm({ ...form, linkLabel: e.target.value })} placeholder="En savoir plus" className={inp} />
          </div>
        </div>

        {/* Image URL also for non-image types */}
        {!isImage && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">URL d'image (optionnel)</label>
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://exemple.com/image.jpg" className={inp} />
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button onClick={handleCreate} disabled={saving || !canCreate} className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" /> {saving ? "Création..." : "Créer la notification"}
          </Button>
        </div>
      </div>

      {/* Notification list */}
      <div className="rounded-2xl border border-white/10 bg-card/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-white">Toutes les notifications</h3>
          <button onClick={refetch} className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5"><RefreshCw className="w-4 h-4" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : allNotifs.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune notification créée</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {allNotifs.map((m: any) => {
              const colorDot = POPUP_COLORS.find((c) => c.value === m.color)?.dot ?? TYPE_DOTS[m.type] ?? "bg-blue-500";
              return (
                <div key={m.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${colorDot}`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${m.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                          {m.isActive ? "Actif" : "Inactif"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold border border-white/10 bg-white/5 text-muted-foreground">
                          {TYPE_LABELS[m.type] ?? m.type}
                        </span>
                        {m.subject && <span className="text-sm font-semibold text-white">{m.subject}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(m.sentAt).toLocaleString("fr")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{m.content ?? (m.imageUrl ? "Image" : "—")}</p>
                      {(m.linkUrl || m.imageUrl) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                          {m.linkUrl && <span>🔗 {m.linkUrl}</span>}
                          {m.imageUrl && <span>🖼 Image</span>}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(m)}
                        disabled={toggling === m.id}
                        title={m.isActive ? "Désactiver" : "Activer"}
                        className={`p-1.5 rounded-lg transition-colors ${m.isActive ? "text-green-400 hover:bg-green-500/10" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
                      >
                        {toggling === m.id ? (
                          <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : m.isActive ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={deleting === m.id}
                        className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        {deleting === m.id ? (
                          <div className="w-4 h-4 border border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: DISCOUNT CODES
══════════════════════════════════════════════════════════════════════════════ */
function AdminDiscountCodes() {
  const { toast } = useToast();
  const { data, loading, refetch } = useAdminFetch<any>("/v1/admin/discount-codes", []);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: "", percent: "", country: "", isActive: false });
  const [saving, setSaving] = useState(false);

  const codes: any[] = data?.codes ?? [];

  const reset = () => { setForm({ code: "", percent: "", country: "", isActive: false }); setEditId(null); setShowForm(false); };

  const save = async () => {
    if (!form.code || !form.percent) { toast({ title: "Code et pourcentage requis", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { code: form.code.toUpperCase().trim(), percent: parseFloat(form.percent), country: form.country || null, isActive: form.isActive };
    const url = editId ? `/v1/admin/discount-codes/${editId}` : "/v1/admin/discount-codes";
    const method = editId ? "PATCH" : "POST";
    const r = await fetch(`${API}${url}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("zynum_token")}` }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!r.ok) { const err = await r.json(); toast({ title: err.error || "Erreur", variant: "destructive" }); return; }
    toast({ title: editId ? "Code modifié" : "Code créé" });
    reset(); refetch();
  };

  const toggle = async (id: number, isActive: boolean) => {
    await fetch(`${API}/v1/admin/discount-codes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("zynum_token")}` }, body: JSON.stringify({ isActive: !isActive }) });
    refetch();
  };

  const remove = async (id: number) => {
    if (!confirm("Supprimer ce code ?")) return;
    await fetch(`${API}/v1/admin/discount-codes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("zynum_token")}` } });
    refetch();
  };

  const startEdit = (c: any) => {
    setForm({ code: c.code, percent: String(c.percent), country: c.country ?? "", isActive: c.isActive });
    setEditId(c.id);
    setShowForm(true);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-5">
      {/* Stats totales */}
      {codes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-card/40 p-4 text-center">
            <p className="text-2xl font-bold text-white">{codes.reduce((s: number, c: any) => s + c.usedCount, 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Utilisations totales</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card/40 p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{codes.reduce((s: number, c: any) => s + Math.round(c.totalSavedFcfa), 0).toLocaleString("fr-FR")} F</p>
            <p className="text-xs text-muted-foreground mt-1">Total économisé FCFA</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card/40 p-4 text-center">
            <p className="text-2xl font-bold text-primary">{codes.filter((c: any) => c.isActive).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Codes actifs</p>
          </div>
        </div>
      )}

      {/* Bouton créer */}
      <Button onClick={() => { reset(); setShowForm(true); }} className="bg-primary hover:bg-primary/90 text-white w-full">
        <Plus className="w-4 h-4 mr-2" /> Nouveau code de réduction
      </Button>

      {/* Formulaire création / édition */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-card/40 p-5 space-y-4">
          <h4 className="font-bold text-white">{editId ? "Modifier le code" : "Créer un code de réduction"}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Code promo</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="EX: PROMO20" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm uppercase placeholder:normal-case" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Réduction (%)</label>
              <input type="number" min="1" max="100" step="0.5" value={form.percent} onChange={e => setForm({ ...form, percent: e.target.value })} placeholder="Ex: 20" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Pays (laisser vide = tous les pays)</label>
            <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Ex: cameroon, nigeria... (vide = tous)" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-sm text-white">Activer immédiatement</span>
            <button onClick={() => setForm({ ...form, isActive: !form.isActive })} className="transition-transform">
              {form.isActive ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-white">{saving ? "Sauvegarde..." : editId ? "Modifier" : "Créer le code"}</Button>
            <Button onClick={reset} variant="outline" className="border-white/10 text-muted-foreground hover:text-white">Annuler</Button>
          </div>
        </div>
      )}

      {/* Liste des codes */}
      {codes.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <Percent className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Aucun code de réduction créé</p>
        </div>
      )}
      <div className="space-y-3">
        {codes.map((c: any) => (
          <div key={c.id} className="rounded-2xl border border-white/10 bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Percent className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm font-mono">{c.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.percent}% de réduction · {c.country ? `Pays: ${c.country}` : "Tous les pays"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(c.id, c.isActive)} className="transition-transform" title={c.isActive ? "Désactiver" : "Activer"}>
                  {c.isActive ? <ToggleRight className="w-7 h-7 text-primary" /> : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
                </button>
                <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
              <div className="text-center">
                <p className="text-sm font-bold text-white">{c.usedCount}</p>
                <p className="text-[10px] text-muted-foreground">Utilisations</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-green-400">{Math.round(c.totalSavedFcfa).toLocaleString("fr-FR")} F</p>
                <p className="text-[10px] text-muted-foreground">Économisé FCFA</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-primary">${(c.totalSavedUsd ?? 0).toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">Économisé USD</p>
              </div>
            </div>
            {c.isActive && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />
                <span className="text-[11px] text-green-300 font-medium">Code actif — visible sur la page d'achat</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: PLATFORM SETTINGS
══════════════════════════════════════════════════════════════════════════════ */
function AdminSettings() {
  const { toast } = useToast();
  const { data, loading, refetch } = useAdminFetch<any>("/v1/admin/settings", []);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      setForm({
        platform_name: data.settings.platform_name ?? "ZyNum",
        support_email: data.settings.support_email ?? "",
        support_telegram: data.settings.support_telegram ?? "",
        support_whatsapp: data.settings.support_whatsapp ?? "",
        support_whatsapp_enabled: data.settings.support_whatsapp_enabled ?? "true",
        support_facebook: data.settings.support_facebook ?? "",
        support_facebook_enabled: data.settings.support_facebook_enabled ?? "true",
        support_whatsapp_channel: data.settings.support_whatsapp_channel ?? "",
        support_whatsapp_channel_enabled: data.settings.support_whatsapp_channel_enabled ?? "true",
        support_email_enabled: data.settings.support_email_enabled ?? "true",
        support_channel: data.settings.support_channel ?? "telegram",
        maintenance_mode: data.settings.maintenance_mode ?? "false",
        maintenance_buy: data.settings.maintenance_buy ?? "false",
        commission_type: data.settings.commission_type ?? "percent",
        commission_value: data.settings.commission_value ?? "0",
        currency_rate: data.settings.currency_rate ?? "620",
        global_discount: data.settings.global_discount ?? "0",
        fivesim_api_key: data.settings.fivesim_api_key ?? "",
      });
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    await adminPost("/v1/admin/settings/bulk", { settings: form });
    toast({ title: "Paramètres sauvegardés" });
    refetch();
    setSaving(false);
  };

  const Field = ({ k, label, type = "text" }: { k: string; label: string; type?: string }) => (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <input type={type} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
    </div>
  );

  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-muted-foreground">{form[k] === "true" ? "Activé" : "Désactivé"}</p>
      </div>
      <button onClick={() => setForm({ ...form, [k]: form[k] === "true" ? "false" : "true" })} className={`relative w-11 h-6 rounded-full transition-colors ${form[k] === "true" ? "bg-primary" : "bg-white/20"}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[k] === "true" ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Clé API 5sim ── */}
      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6 space-y-4">
        <h3 className="font-bold text-white flex items-center gap-2"><Key className="w-5 h-5 text-yellow-400" /> Clé API 5sim</h3>
        <p className="text-xs text-muted-foreground">Cette clé est utilisée pour accéder à l'API 5sim (achat de numéros virtuels). Elle est chiffrée en base de données et jamais exposée aux utilisateurs.</p>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Clé API Bearer</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? "text" : "password"}
                value={form.fivesim_api_key ?? ""}
                onChange={(e) => setForm({ ...form, fivesim_api_key: e.target.value })}
                placeholder="Collez votre clé API 5sim ici"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {form.fivesim_api_key && (
            <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Clé configurée — sauvegardez pour appliquer
            </p>
          )}
          {!form.fivesim_api_key && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Aucune clé configurée — le service est inopérant
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/40 p-6 space-y-4">
        <h3 className="font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Informations de la plateforme</h3>
        <Field k="platform_name" label="Nom de la plateforme" />
        <Field k="support_email" label="Email du support" type="email" />
        <Field k="currency_rate" label="Taux de change (1 USD = X FCFA)" type="number" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/40 p-6 space-y-4">
        <h3 className="font-bold text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Contacts & Support</h3>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Canal principal de support</label>
          <select value={form.support_channel ?? "telegram"} onChange={(e) => setForm({ ...form, support_channel: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm">
            <option value="telegram">Telegram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="other">Autre</option>
          </select>
        </div>
        <Field k="support_telegram" label="Lien Telegram" />
        <Field k="support_whatsapp" label="Lien WhatsApp support (ex: https://wa.me/2250XXXXXXXX)" />
      </div>

      {/* ── Centre d'aide — boutons de contact ── */}
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 space-y-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-green-400" /> Centre d'aide — Boutons de contact
        </h3>
        <p className="text-xs text-muted-foreground">Configurez les boutons visibles sur la page Centre d'aide. Désactivez un bouton pour le masquer sans supprimer le lien.</p>

        {/* WhatsApp support */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Bouton WhatsApp support</p>
            <button
              onClick={() => setForm({ ...form, support_whatsapp_enabled: form.support_whatsapp_enabled === "true" ? "false" : "true" })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.support_whatsapp_enabled === "true" ? "bg-green-500" : "bg-white/20"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.support_whatsapp_enabled === "true" ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Lien WhatsApp</label>
            <input
              type="text"
              value={form.support_whatsapp ?? ""}
              onChange={(e) => setForm({ ...form, support_whatsapp: e.target.value })}
              placeholder="https://wa.me/2250XXXXXXXX"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">Ce lien est aussi utilisé sur la bannière WhatsApp en haut de la page.</p>
        </div>

        {/* WhatsApp Channel */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Bouton Canal WhatsApp</p>
            <button
              onClick={() => setForm({ ...form, support_whatsapp_channel_enabled: form.support_whatsapp_channel_enabled === "true" ? "false" : "true" })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.support_whatsapp_channel_enabled === "true" ? "bg-green-500" : "bg-white/20"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.support_whatsapp_channel_enabled === "true" ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Lien Canal WhatsApp</label>
            <input
              type="text"
              value={form.support_whatsapp_channel ?? ""}
              onChange={(e) => setForm({ ...form, support_whatsapp_channel: e.target.value })}
              placeholder="https://whatsapp.com/channel/..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
            />
          </div>
        </div>

        {/* Facebook */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Bouton Page Facebook</p>
            <button
              onClick={() => setForm({ ...form, support_facebook_enabled: form.support_facebook_enabled === "true" ? "false" : "true" })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.support_facebook_enabled === "true" ? "bg-blue-500" : "bg-white/20"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.support_facebook_enabled === "true" ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Lien Page Facebook</label>
            <input
              type="text"
              value={form.support_facebook ?? ""}
              onChange={(e) => setForm({ ...form, support_facebook: e.target.value })}
              placeholder="https://facebook.com/zynum"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
            />
          </div>
        </div>

        {/* Email Support */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Bouton Email Support</p>
            <button
              onClick={() => setForm({ ...form, support_email_enabled: form.support_email_enabled === "true" ? "false" : "true" })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.support_email_enabled === "true" ? "bg-indigo-500" : "bg-white/20"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.support_email_enabled === "true" ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Email du support</label>
            <input
              type="email"
              value={form.support_email ?? ""}
              onChange={(e) => setForm({ ...form, support_email: e.target.value })}
              placeholder="support@zynum.net"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">Affiché sur la page Centre d'aide. L'email saisi ici remplace aussi le champ "Email du support" dans les informations de la plateforme.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/40 p-6 space-y-4">
        <h3 className="font-bold text-white flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" /> Tarification à paliers (1 USD = 620 FCFA)</h3>
        <p className="text-xs text-muted-foreground">Les prix affichés aux clients sont calculés automatiquement selon le prix brut 5sim.</p>
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Palier 1</span>
              <span className="text-xs text-muted-foreground">— numéros économiques</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Prix 5sim</span>
              <span className="text-white font-medium">30F → 500F</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Prix ZyNum</span>
              <span className="text-green-400 font-semibold">1 100F → 2 200F</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">En USD</span>
              <span className="text-muted-foreground">$1.77 → $3.55</span>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Palier 2</span>
              <span className="text-xs text-muted-foreground">— numéros premium</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Prix 5sim</span>
              <span className="text-white font-medium">1 000F → 3 000F</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Prix ZyNum</span>
              <span className="text-green-400 font-semibold">2 000F → 4 500F</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">En USD</span>
              <span className="text-muted-foreground">$3.23 → $7.26</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Plancher minimum : <span className="text-white font-medium">1 100 FCFA</span> · Au-delà de 3 000F : extrapolation palier 2</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/40 p-6 space-y-3">
        <h3 className="font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-400" /> Maintenance</h3>
        <Toggle k="maintenance_mode" label="Mode maintenance général" />
        <Toggle k="maintenance_buy" label="Achats de numéros désactivés" />
      </div>

      <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90 text-white w-full">
        {saving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
      </Button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: OMNIPAY ADMIN (solde + retrait)
══════════════════════════════════════════════════════════════════════════════ */
const OMNIPAY_OPERATORS_LIST = [
  { id: "ORANGE_CI", label: "Orange CI" }, { id: "MTN_CI",    label: "MTN CI" },
  { id: "MOOV_CI",   label: "Moov CI" },   { id: "WAVE_CI",   label: "Wave CI" },
  { id: "MIXX_CI",   label: "Mixx CI" },   { id: "WAVE_SN",   label: "Wave SN" },
  { id: "ORANGE_SN", label: "Orange SN" }, { id: "FREE_SN",   label: "Free SN" },
  { id: "ORANGE_BF", label: "Orange BF" }, { id: "MOOV_BF",   label: "Moov BF" },
  { id: "ORANGE_ML", label: "Orange ML" }, { id: "MOOV_ML",   label: "Moov ML" },
  { id: "ORANGE_GN", label: "Orange GN" }, { id: "MTN_GN",    label: "MTN GN" },
  { id: "MTN_CM",    label: "MTN CM" },    { id: "ORANGE_CM", label: "Orange CM" },
  { id: "MTN_BJ",    label: "MTN BJ" },    { id: "MOOV_BJ",   label: "Moov BJ" },
  { id: "MOOV_TG",   label: "Moov TG" },   { id: "TOGOCEL_TG",label: "Togocel TG" },
  { id: "MTN_GH",    label: "MTN GH" },    { id: "AIRTEL_GH", label: "Airtel GH" },
  { id: "MOOV_NE",   label: "Moov NE" },
];

// ─── Admin: Opérateurs par Agrégateur ────────────────────────────────────────
const AGGREGATORS = [
  { id: "omnipay",    label: "OmniPay",     color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  { id: "paxity",     label: "Paxity",      color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  { id: "sendavapay", label: "SendavaPay",  color: "bg-green-500/10 text-green-400 border-green-500/30" },
  { id: "ashtechpay", label: "AshTechPay",  color: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
];

function AdminOperatorRoutes() {
  const { toast } = useToast();
  const { data, loading, refetch } = useAdminFetch<any>("/v1/admin/operator-routes", []);
  const [editOp, setEditOp]       = useState<any | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [seeding, setSeeding]     = useState(false);
  const [editForm, setEditForm]   = useState<any>({});
  const [addForm, setAddForm]     = useState({
    countryCode:"", countryName:"", flag:"🌍", prefix:"", currency:"XOF", currencySymbol:"FCFA",
    operatorName:"", operatorKey:"", aggregator:"omnipay",
    isActive:true, needsOtp:false, needsReturnUrl:false,
    otpHint:"", paxityOperatorId:"",
  });

  const operators: any[] = data?.operators ?? [];

  // Group by country
  const byCountry = operators.reduce((acc: any, op: any) => {
    if (!acc[op.countryCode]) acc[op.countryCode] = { code: op.countryCode, name: op.countryName, flag: op.flag, ops: [] };
    acc[op.countryCode].ops.push(op);
    return acc;
  }, {} as Record<string, any>);
  const countries = Object.values(byCountry) as any[];

  const aggStyle = (agg: string) => AGGREGATORS.find(a => a.id === agg)?.color ?? "bg-white/5 text-muted-foreground border-white/10";
  const aggLabel = (agg: string) => AGGREGATORS.find(a => a.id === agg)?.label ?? agg;

  const seed = async () => {
    setSeeding(true);
    const r = await adminPost("/v1/admin/operator-routes/seed", {});
    setSeeding(false);
    toast({ title: `${r.inserted ?? 0} opérateurs initialisés` });
    refetch();
  };

  const [syncing, setSyncing] = useState(false);
  const syncAtp = async () => {
    setSyncing(true);
    const r = await adminPost("/v1/admin/ashtechpay/sync-countries", {});
    setSyncing(false);
    if (r.error) { toast({ title: r.error, variant: "destructive" }); return; }
    toast({ title: `Sync AshTechPay : ${r.countries} pays, ${r.inserted} opérateurs mis à jour` });
    refetch();
  };

  const openEdit = (op: any) => {
    setEditOp(op);
    setEditForm({
      aggregator: op.aggregator,
      isActive: op.isActive,
      needsOtp: op.needsOtp,
      needsReturnUrl: op.needsReturnUrl,
      otpHint: op.otpHint ?? "",
      paxityOperatorId: op.paxityOperatorId ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editOp) return;
    await adminPatch(`/v1/admin/operator-routes/${editOp.id}`, {
      ...editForm,
      otpHint: editForm.otpHint || null,
      paxityOperatorId: editForm.paxityOperatorId || null,
    });
    toast({ title: "Opérateur mis à jour" });
    setEditOp(null);
    refetch();
  };

  const remove = async (id: number) => {
    await adminDelete(`/v1/admin/operator-routes/${id}`);
    toast({ title: "Opérateur supprimé" });
    refetch();
  };

  const bulkToggle = async (countryCode: string, isActive: boolean) => {
    await adminPost("/v1/admin/operator-routes/bulk", { countryCode, isActive });
    toast({ title: isActive ? "Pays activé" : "Pays désactivé" });
    refetch();
  };

  const toggleActive = async (op: any) => {
    await adminPatch(`/v1/admin/operator-routes/${op.id}`, { isActive: !op.isActive });
    refetch();
  };

  const addOperator = async () => {
    if (!addForm.countryCode || !addForm.operatorName || !addForm.operatorKey) {
      toast({ title: "Remplissez pays, nom et clé de l'opérateur", variant: "destructive" });
      return;
    }
    const r = await adminPost("/v1/admin/operator-routes", {
      ...addForm,
      otpHint: addForm.otpHint || null,
      paxityOperatorId: addForm.paxityOperatorId || null,
    });
    if (r.error) { toast({ title: r.error, variant: "destructive" }); return; }
    toast({ title: "Opérateur ajouté" });
    setShowAdd(false);
    refetch();
  };

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm";

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={seed} disabled={seeding} className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 h-8 px-3 text-xs">
          {seeding ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Initialisation…</> : "Initialiser les défauts"}
        </Button>
        <Button onClick={syncAtp} disabled={syncing} className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 h-8 px-3 text-xs">
          {syncing ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Sync…</> : "↻ Sync AshTechPay"}
        </Button>
        <Button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary/90 text-white h-8 px-3 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter un opérateur
        </Button>
        <div className="flex gap-2 ml-auto">
          {AGGREGATORS.map(a => (
            <span key={a.id} className={`text-xs px-2 py-1 rounded-lg border font-medium ${a.color}`}>{a.label}</span>
          ))}
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
          <h3 className="font-bold text-white text-sm">Nouvel opérateur</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Code pays</label>
              <input value={addForm.countryCode} onChange={e => setAddForm({...addForm, countryCode: e.target.value.toUpperCase()})} placeholder="CI" className={inp} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Nom pays</label>
              <input value={addForm.countryName} onChange={e => setAddForm({...addForm, countryName: e.target.value})} placeholder="Côte d'Ivoire" className={inp} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Drapeau</label>
              <input value={addForm.flag} onChange={e => setAddForm({...addForm, flag: e.target.value})} placeholder="🇨🇮" className={inp} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Préfixe</label>
              <input value={addForm.prefix} onChange={e => setAddForm({...addForm, prefix: e.target.value})} placeholder="225" className={inp} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Devise</label>
              <input value={addForm.currency} onChange={e => setAddForm({...addForm, currency: e.target.value.toUpperCase()})} placeholder="XOF" className={inp} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Symbole devise</label>
              <input value={addForm.currencySymbol} onChange={e => setAddForm({...addForm, currencySymbol: e.target.value})} placeholder="FCFA" className={inp} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Nom opérateur</label>
              <input value={addForm.operatorName} onChange={e => setAddForm({...addForm, operatorName: e.target.value})} placeholder="Orange Money" className={inp} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Clé unique</label>
              <input value={addForm.operatorKey} onChange={e => setAddForm({...addForm, operatorKey: e.target.value.toUpperCase().replace(/\s+/g,"_")})} placeholder="ORANGE_CI" className={`${inp} font-mono`} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Agrégateur</label>
              <select value={addForm.aggregator} onChange={e => setAddForm({...addForm, aggregator: e.target.value})} className={inp}>
                {AGGREGATORS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select></div>
            <div><label className="text-xs text-muted-foreground block mb-1">ID Paxity (si Paxity)</label>
              <input value={addForm.paxityOperatorId} onChange={e => setAddForm({...addForm, paxityOperatorId: e.target.value})} placeholder="MOOVTG" className={`${inp} font-mono`} /></div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input type="checkbox" checked={addForm.isActive} onChange={e => setAddForm({...addForm, isActive: e.target.checked})} className="w-4 h-4 rounded accent-primary" />
              Actif
            </label>
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input type="checkbox" checked={addForm.needsOtp} onChange={e => setAddForm({...addForm, needsOtp: e.target.checked})} className="w-4 h-4 rounded accent-primary" />
              OTP requis
            </label>
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input type="checkbox" checked={addForm.needsReturnUrl} onChange={e => setAddForm({...addForm, needsReturnUrl: e.target.checked})} className="w-4 h-4 rounded accent-primary" />
              Redirect Wave
            </label>
          </div>
          <div><label className="text-xs text-muted-foreground block mb-1">Instruction OTP (optionnel)</label>
            <input value={addForm.otpHint} onChange={e => setAddForm({...addForm, otpHint: e.target.value})} placeholder="Composez #144*82# pour générer votre OTP..." className={inp} /></div>
          <div className="flex gap-3">
            <Button onClick={addOperator} className="bg-primary hover:bg-primary/90 text-white">Ajouter</Button>
            <Button onClick={() => setShowAdd(false)} variant="outline" className="border-white/10 text-white hover:bg-white/5">Annuler</Button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor:"rgba(0,0,0,0.7)"}}>
          <div className="w-full max-w-md bg-card border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">{editOp.flag} {editOp.operatorName} — {editOp.countryName}</h3>
              <button onClick={() => setEditOp(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-white/10"><X className="w-4 h-4" /></button>
            </div>
            <div><label className="text-xs text-muted-foreground block mb-1">Agrégateur</label>
              <select value={editForm.aggregator} onChange={e => setEditForm({...editForm, aggregator: e.target.value})} className={inp}>
                {AGGREGATORS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
            {editForm.aggregator === "paxity" && (
              <div><label className="text-xs text-muted-foreground block mb-1">ID Paxity</label>
                <input value={editForm.paxityOperatorId} onChange={e => setEditForm({...editForm, paxityOperatorId: e.target.value})} placeholder="MOOVTG" className={`${inp} font-mono`} /></div>
            )}
            <div><label className="text-xs text-muted-foreground block mb-1">Instruction OTP</label>
              <input value={editForm.otpHint} onChange={e => setEditForm({...editForm, otpHint: e.target.value})} placeholder="Ex: Composez #144*82# sur votre téléphone…" className={inp} /></div>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm({...editForm, isActive: e.target.checked})} className="w-4 h-4 rounded accent-primary" />
                Actif
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={editForm.needsOtp} onChange={e => setEditForm({...editForm, needsOtp: e.target.checked})} className="w-4 h-4 rounded accent-primary" />
                OTP requis
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={editForm.needsReturnUrl} onChange={e => setEditForm({...editForm, needsReturnUrl: e.target.checked})} className="w-4 h-4 rounded accent-primary" />
                Redirect Wave
              </label>
            </div>
            <div className="flex gap-3">
              <Button onClick={saveEdit} className="bg-primary hover:bg-primary/90 text-white flex-1">Enregistrer</Button>
              <Button onClick={() => setEditOp(null)} variant="outline" className="border-white/10 text-white hover:bg-white/5">Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Operators by country */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : countries.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Globe2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-sm">Aucun opérateur configuré.</p>
          <p className="text-muted-foreground text-xs">Cliquez sur "Initialiser les défauts" pour charger la liste par défaut.</p>
        </div>
      ) : (
        countries.sort((a: any, b: any) => a.name.localeCompare(b.name, "fr")).map((country: any) => (
          <div key={country.code} className="rounded-2xl border border-white/10 bg-card/40 overflow-hidden">
            {/* Country header */}
            <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
              <span className="text-2xl">{country.flag}</span>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{country.name}</p>
                <p className="text-xs text-muted-foreground">{country.ops.length} opérateur{country.ops.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => bulkToggle(country.code, true)} className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors">
                  Tout activer
                </button>
                <button onClick={() => bulkToggle(country.code, false)} className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                  Tout désactiver
                </button>
              </div>
            </div>

            {/* Operators list */}
            <div className="divide-y divide-white/5">
              {country.ops.map((op: any) => (
                <div key={op.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{op.operatorName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{op.operatorKey}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${aggStyle(op.aggregator)}`}>{aggLabel(op.aggregator)}</span>
                    <button
                      onClick={() => toggleActive(op)}
                      className={`text-xs px-2 py-0.5 rounded-lg border font-medium transition-colors ${op.isActive ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-white/5 text-muted-foreground border-white/10"}`}
                    >
                      {op.isActive ? "Actif" : "Inactif"}
                    </button>
                    {op.needsOtp && <span className="text-xs px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">OTP</span>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(op)} className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(op.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AdminOmniPay() {
  const { toast } = useToast();
  const [balance, setBalance]           = useState<any>(null);
  const [balLoading, setBalLoading]     = useState(false);
  const [withdraw, setWithdraw]         = useState({ phone: "", operatorId: "ORANGE_CI", amount: "", firstName: "", lastName: "", note: "" });
  const [wLoading, setWLoading]         = useState(false);
  const [wResult,  setWResult]          = useState<any>(null);
  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm";

  const fetchBalance = async () => {
    setBalLoading(true);
    try {
      const token = localStorage.getItem("zynum_token") ?? "";
      const r = await fetch(`${API}/v1/admin/omnipay/balance`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setBalance(d);
    } catch {
      toast({ variant: "destructive", title: "Erreur réseau" });
    } finally { setBalLoading(false); }
  };

  const handleWithdraw = async () => {
    if (!withdraw.phone || !withdraw.amount) {
      toast({ variant: "destructive", title: "Remplissez tous les champs obligatoires" });
      return;
    }
    setWLoading(true); setWResult(null);
    try {
      const token = localStorage.getItem("zynum_token") ?? "";
      const r = await fetch(`${API}/v1/admin/omnipay/withdraw`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(withdraw),
      });
      const d = await r.json();
      setWResult(d);
      if (d.success) toast({ title: "Retrait initié", description: `Réf: ${d.reference}` });
      else toast({ variant: "destructive", title: "Échec du retrait", description: d.raw?.message ?? d.error ?? "Erreur" });
    } catch {
      toast({ variant: "destructive", title: "Erreur réseau" });
    } finally { setWLoading(false); }
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Solde */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center"><Wallet className="w-4 h-4 text-primary" /></div>
            <div>
              <h3 className="font-bold text-white text-sm">Solde OmniPay</h3>
              <p className="text-xs text-muted-foreground">Compte marchand</p>
            </div>
          </div>
          <Button onClick={fetchBalance} disabled={balLoading} className="bg-primary hover:bg-primary/90 text-white h-8 px-3 text-xs">
            {balLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
            {balLoading ? "Chargement…" : "Actualiser"}
          </Button>
        </div>
        {balance && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <pre className="text-xs text-green-400 whitespace-pre-wrap overflow-x-auto font-mono">
              {JSON.stringify(balance.raw ?? balance, null, 2)}
            </pre>
          </div>
        )}
        {!balance && !balLoading && (
          <p className="text-xs text-muted-foreground text-center py-2">Cliquez sur Actualiser pour voir le solde.</p>
        )}
      </div>

      {/* Retrait */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center"><Send className="w-4 h-4 text-amber-400" /></div>
          <div>
            <h3 className="font-bold text-white text-sm">Retrait OmniPay</h3>
            <p className="text-xs text-muted-foreground">Envoyer des fonds vers un compte mobile money</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Numéro de téléphone *</label>
            <input value={withdraw.phone} onChange={(e) => setWithdraw({ ...withdraw, phone: e.target.value })} placeholder="ex: 0708000000" className={inp} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Opérateur *</label>
            <select value={withdraw.operatorId} onChange={(e) => setWithdraw({ ...withdraw, operatorId: e.target.value })} className={inp}>
              {OMNIPAY_OPERATORS_LIST.map((op) => <option key={op.id} value={op.id}>{op.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Prénom du bénéficiaire *</label>
            <input value={withdraw.firstName} onChange={(e) => setWithdraw({ ...withdraw, firstName: e.target.value })} placeholder="ex: Jean" className={inp} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Nom du bénéficiaire *</label>
            <input value={withdraw.lastName} onChange={(e) => setWithdraw({ ...withdraw, lastName: e.target.value })} placeholder="ex: Koné" className={inp} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Montant (FCFA) *</label>
            <input type="number" value={withdraw.amount} onChange={(e) => setWithdraw({ ...withdraw, amount: e.target.value })} placeholder="ex: 5000" className={inp} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Note interne</label>
            <input value={withdraw.note} onChange={(e) => setWithdraw({ ...withdraw, note: e.target.value })} placeholder="Raison du retrait" className={inp} />
          </div>
        </div>
        <Button onClick={handleWithdraw} disabled={wLoading || !withdraw.phone || !withdraw.amount} className="bg-amber-600 hover:bg-amber-500 text-white">
          {wLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Traitement…</> : <><Send className="w-4 h-4 mr-2" /> Effectuer le retrait</>}
        </Button>
        {wResult && (
          <div className={`rounded-xl border p-4 ${wResult.success ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            <p className="text-xs font-semibold mb-2 ${wResult.success ? 'text-green-400' : 'text-red-400'}">{wResult.success ? "✓ Retrait initié" : "✗ Échec"} — Réf: {wResult.reference}</p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto font-mono">
              {JSON.stringify(wResult.raw ?? wResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: PAYMENT PROVIDERS
══════════════════════════════════════════════════════════════════════════════ */
/* ─── CRYPTO PROVIDER TOGGLES ───────────────────────────────────────────── */
function AdminCryptoToggles() {
  const { toast } = useToast();
  const { data: settingsData, loading, refetch } = useAdminFetch<{ settings: Record<string, string> }>("/v1/admin/settings", []);
  const [saving, setSaving] = useState<string | null>(null);

  const settings = settingsData?.settings ?? {};
  const oxapayEnabled     = settings["oxapay_enabled"] !== "false";
  const nowpaymentsEnabled = settings["nowpayments_enabled"] !== "false";

  const toggle = async (key: string, current: boolean) => {
    setSaving(key);
    try {
      await adminPost("/v1/admin/settings", { key, value: current ? "false" : "true" });
      toast({ title: current ? "Désactivé" : "Activé", description: key === "oxapay_enabled" ? "OxaPay mis à jour" : "NowPayments mis à jour" });
      refetch();
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder" });
    } finally { setSaving(null); }
  };

  const providers = [
    { key: "oxapay_enabled",      label: "OxaPay",      desc: "Paiement via adresse crypto OxaPay (iframe)", enabled: oxapayEnabled,      emoji: "🔶" },
    { key: "nowpayments_enabled", label: "NowPayments", desc: "Paiement USDT, BTC, ETH, LTC, TRX (QR code)", enabled: nowpaymentsEnabled, emoji: "₿" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-card/40 overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
        <span className="text-lg">₿</span>
        <h3 className="font-semibold text-white">Passerelles Crypto</h3>
        <span className="text-xs text-muted-foreground ml-auto">Activer / désactiver les boutons dans le modal de recharge</span>
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="divide-y divide-white/5">
          {providers.map(p => (
            <div key={p.key} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">{p.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{p.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.desc}</p>
                </div>
              </div>
              <button
                onClick={() => toggle(p.key, p.enabled)}
                disabled={saving === p.key}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm transition-all shrink-0 ${
                  p.enabled
                    ? "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25"
                    : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                }`}
              >
                {saving === p.key
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : p.enabled
                    ? <><ToggleRight className="w-4 h-4" /> Activé</>
                    : <><ToggleLeft className="w-4 h-4" /> Désactivé</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPayments() {
  const { toast } = useToast();
  const { data, loading, refetch } = useAdminFetch<any>("/v1/admin/payment-providers", []);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: "card", name: "", slug: "" });

  const categories = [
    { id: "card", label: "Carte bancaire" },
    { id: "mobile_money", label: "Mobile Money" },
    { id: "crypto", label: "Crypto-monnaie" },
  ];

  const add = async () => {
    if (!form.name || !form.slug) return;
    await adminPost("/v1/admin/payment-providers", form);
    toast({ title: "Fournisseur ajouté" });
    setForm({ category: "card", name: "", slug: "" });
    setShowAdd(false);
    refetch();
  };
  const toggle = async (p: any, field: "isActive" | "isSelected") => {
    await adminPatch(`/v1/admin/payment-providers/${p.id}`, { [field]: !p[field] });
    refetch();
  };
  const remove = async (id: number) => {
    await adminDelete(`/v1/admin/payment-providers/${id}`);
    toast({ title: "Fournisseur supprimé" });
    refetch();
  };

  return (
    <div className="space-y-6">
      <AdminCryptoToggles />

      <AdminOmniPay />

      <div className="flex items-center gap-3 mb-1">
        <CreditCard className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-white text-sm">Fournisseurs de paiement</h3>
        <div className="flex-1 border-t border-white/10" />
        <Button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary/90 text-white h-8 px-3 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Ajouter</Button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
          <h3 className="font-bold text-white">Nouveau fournisseur</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Catégorie</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nom</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Stripe, CinetPay..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Identifiant (slug)</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="stripe" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono" />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={add} className="bg-primary hover:bg-primary/90 text-white">Ajouter</Button>
            <Button onClick={() => setShowAdd(false)} variant="outline" className="border-white/10 text-white hover:bg-white/5">Annuler</Button>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        categories.map((cat) => {
          const providers = (data?.providers ?? []).filter((p: any) => p.category === cat.id);
          return (
            <div key={cat.id} className="rounded-2xl border border-white/10 bg-card/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-white">{cat.label}</h3>
                <span className="text-xs text-muted-foreground ml-auto">{providers.length} fournisseur{providers.length !== 1 ? "s" : ""}</span>
              </div>
              {providers.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucun fournisseur configuré</p>}
              <div className="divide-y divide-white/5">
                {providers.map((p: any) => (
                  <div key={p.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.slug}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggle(p, "isActive")} className={`text-xs px-2 py-1 rounded-lg border font-medium ${p.isActive ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                        {p.isActive ? "Actif" : "Inactif"}
                      </button>
                      <button onClick={() => toggle(p, "isSelected")} className={`text-xs px-2 py-1 rounded-lg border font-medium ${p.isSelected ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                        {p.isSelected ? "✓ Sélectionné" : "Sélectionner"}
                      </button>
                      <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: FAQ / HELP CENTER
══════════════════════════════════════════════════════════════════════════════ */
function AdminFaq() {
  const { toast } = useToast();
  const { data, loading, refetch } = useAdminFetch<any>("/v1/admin/faq", []);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ type: "faq", category: "", question: "", answer: "", lang: "fr", isActive: true, sortOrder: 0 });

  const save = async () => {
    if (editItem) {
      await adminPatch(`/v1/admin/faq/${editItem.id}`, form);
      toast({ title: "Article mis à jour" });
      setEditItem(null);
    } else {
      await adminPost("/v1/admin/faq", form);
      toast({ title: "Article créé" });
      setShowAdd(false);
    }
    setForm({ type: "faq", category: "", question: "", answer: "", lang: "fr", isActive: true, sortOrder: 0 });
    refetch();
  };
  const remove = async (id: number) => { await adminDelete(`/v1/admin/faq/${id}`); toast({ title: "Supprimé" }); refetch(); };
  const toggleActive = async (a: any) => { await adminPatch(`/v1/admin/faq/${a.id}`, { isActive: !a.isActive }); refetch(); };
  const startEdit = (a: any) => { setForm({ type: a.type, category: a.category ?? "", question: a.question, answer: a.answer, lang: a.lang, isActive: a.isActive, sortOrder: a.sortOrder }); setEditItem(a); setShowAdd(false); };

  const FormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm">
            <option value="faq">FAQ</option>
            <option value="article">Article d'aide</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Langue</label>
          <select value={form.lang} onChange={(e) => setForm({ ...form, lang: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm">
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Catégorie</label>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Général, Paiement..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Question / Titre</label>
        <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Réponse / Contenu</label>
        <textarea rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm resize-none" />
      </div>
      <div className="flex gap-3">
        <Button onClick={save} className="bg-primary hover:bg-primary/90 text-white">Sauvegarder</Button>
        <Button onClick={() => { setShowAdd(false); setEditItem(null); }} variant="outline" className="border-white/10 text-white hover:bg-white/5">Annuler</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => { setShowAdd(true); setEditItem(null); }} className="bg-primary hover:bg-primary/90 text-white"><Plus className="w-4 h-4 mr-2" /> Ajouter</Button>
      </div>
      {(showAdd || editItem) && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <h3 className="font-bold text-white mb-4">{editItem ? "Modifier" : "Nouvel article"}</h3>
          <FormFields />
        </div>
      )}
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="space-y-3">
          {(data?.articles ?? []).map((a: any) => (
            <div key={a.id} className={`rounded-2xl border ${a.isActive ? "border-white/10" : "border-white/5 opacity-60"} bg-card/40 p-4 flex gap-4`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${a.type === "faq" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-purple-500/20 text-purple-400 border-purple-500/30"}`}>{a.type}</span>
                  <span className="text-xs text-muted-foreground">{a.lang.toUpperCase()}</span>
                  {a.category && <span className="text-xs text-muted-foreground">• {a.category}</span>}
                </div>
                <p className="text-sm font-semibold text-white mb-1">{a.question}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.answer}</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => startEdit(a)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => toggleActive(a)} className={`p-1.5 rounded-lg ${a.isActive ? "text-green-400 hover:bg-green-500/10" : "text-muted-foreground hover:bg-white/5"}`}><CheckCircle className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(a.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {!data?.articles?.length && <p className="text-sm text-muted-foreground text-center py-8">Aucun article</p>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: SOCIAL LINKS
══════════════════════════════════════════════════════════════════════════════ */
function AdminSocialLinks() {
  const { toast } = useToast();
  const { data, loading, refetch } = useAdminFetch<any>("/v1/admin/social-links", []);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ platform: "", url: "", icon: "" });
  const [form, setForm] = useState({ platform: "", url: "", icon: "" });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const links: any[] = data?.links ?? [];
  const allSelected = links.length > 0 && selected.size === links.length;
  const someSelected = selected.size > 0;

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(links.map((l: any) => l.id)));
    }
  };

  const add = async () => {
    if (!form.platform || !form.url) return;
    await adminPost("/v1/admin/social-links", form);
    toast({ title: "Lien ajouté" });
    setForm({ platform: "", url: "", icon: "" });
    setShowAdd(false);
    refetch();
  };

  const startEdit = (l: any) => {
    setEditId(l.id);
    setEditForm({ platform: l.platform, url: l.url, icon: l.icon ?? "" });
  };

  const saveEdit = async () => {
    if (!editId) return;
    await adminPatch(`/v1/admin/social-links/${editId}`, editForm);
    toast({ title: "Lien modifié" });
    setEditId(null);
    refetch();
  };

  const toggle = async (l: any) => { await adminPatch(`/v1/admin/social-links/${l.id}`, { isActive: !l.isActive }); refetch(); };
  const remove = async (id: number) => { await adminDelete(`/v1/admin/social-links/${id}`); toast({ title: "Supprimé" }); refetch(); };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    await Promise.all([...selected].map((id) => adminDelete(`/v1/admin/social-links/${id}`)));
    toast({ title: `${selected.size} lien(s) supprimé(s)` });
    setSelected(new Set());
    setDeleting(false);
    refetch();
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {someSelected ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{selected.size} sélectionné(s)</span>
            <Button
              onClick={bulkDelete}
              disabled={deleting}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
              Supprimer la sélection
            </Button>
            <Button onClick={() => setSelected(new Set())} size="sm" variant="ghost" className="text-muted-foreground hover:text-white">Désélectionner</Button>
          </div>
        ) : (
          <div />
        )}
        <Button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary/90 text-white ml-auto">
          <Plus className="w-4 h-4 mr-2" /> Ajouter lien
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
          <h3 className="font-bold text-white">Nouveau lien social</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Plateforme</label>
              <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="Facebook, Twitter..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">URL</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Icône (slug simpleicons)</label>
              <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="facebook" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={add} className="bg-primary hover:bg-primary/90 text-white">Ajouter</Button>
            <Button onClick={() => setShowAdd(false)} variant="outline" className="border-white/10 text-white hover:bg-white/5">Annuler</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {/* Select-all header */}
          {links.length > 0 && (
            <div className="flex items-center gap-3 px-1 pb-1 border-b border-white/[0.06]">
              <button
                onClick={toggleAll}
                className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0
                  ${allSelected ? "bg-primary border-primary" : "border-white/20 bg-white/5 hover:border-primary/60"}`}
              >
                {allSelected && <Check className="w-3 h-3 text-white" />}
                {!allSelected && someSelected && <div className="w-2 h-0.5 bg-primary rounded" />}
              </button>
              <span className="text-xs text-muted-foreground">Tout sélectionner</span>
            </div>
          )}

          {links.map((l: any) => {
            const isSelected = selected.has(l.id);
            return (
              <div key={l.id} className={`rounded-2xl border bg-card/40 overflow-hidden transition-colors
                ${isSelected ? "border-primary/50 bg-primary/5" : l.isActive ? "border-white/10" : "border-white/5 opacity-60"}`}>
                {/* Row */}
                <div className="flex items-center gap-3 p-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(l.id)}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0
                      ${isSelected ? "bg-primary border-primary" : "border-white/20 bg-white/5 hover:border-primary/60"}`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>

                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    {l.icon
                      ? <img src={`https://cdn.simpleicons.org/${l.icon}/ffffff`} className="w-5 h-5" alt={l.platform} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : <span className="text-xs font-bold text-muted-foreground">{l.platform.charAt(0)}</span>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{l.platform}</p>
                    <p className="text-xs text-muted-foreground truncate">{l.url}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(l)} className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5" title="Modifier"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggle(l)} className={`p-1.5 rounded-lg ${l.isActive ? "text-green-400 hover:bg-green-500/10" : "text-muted-foreground hover:bg-white/5"}`} title={l.isActive ? "Désactiver" : "Activer"}>
                      {l.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => remove(l.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Inline edit form */}
                {editId === l.id && (
                  <div className="px-4 pb-4 border-t border-white/[0.06] pt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Plateforme</label>
                        <input value={editForm.platform} onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">URL</label>
                        <input value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Icône (slug simpleicons)</label>
                        <input value={editForm.icon} onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })} placeholder="facebook" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} size="sm" className="bg-primary hover:bg-primary/90 text-white">Sauvegarder</Button>
                      <Button onClick={() => setEditId(null)} size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/5">Annuler</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!links.length && <p className="text-sm text-muted-foreground text-center py-8">Aucun lien social configuré</p>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: COUNTRIES
══════════════════════════════════════════════════════════════════════════════ */
function AdminCountries() {
  const { toast } = useToast();
  const { data, loading, refetch } = useAdminFetch<any>("/v1/admin/countries", []);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ countrySlug: "", countryName: "", isDisabled: false, priceMultiplier: 1.0 });

  const add = async () => {
    if (!form.countrySlug || !form.countryName) return;
    await adminPost("/v1/admin/countries", form);
    toast({ title: "Pays configuré" });
    setForm({ countrySlug: "", countryName: "", isDisabled: false, priceMultiplier: 1.0 });
    setShowAdd(false);
    refetch();
  };
  const toggle = async (c: any) => { await adminPatch(`/v1/admin/countries/${c.id}`, { isDisabled: !c.isDisabled }); toast({ title: c.isDisabled ? "Pays activé" : "Pays désactivé" }); refetch(); };
  const updateMultiplier = async (c: any, value: string) => { await adminPatch(`/v1/admin/countries/${c.id}`, { priceMultiplier: parseFloat(value) }); refetch(); };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary/90 text-white"><Plus className="w-4 h-4 mr-2" /> Ajouter override</Button>
      </div>
      {showAdd && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
          <h3 className="font-bold text-white">Configurer un pays</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Slug pays (ex: france, russia)</label>
              <input value={form.countrySlug} onChange={(e) => setForm({ ...form, countrySlug: e.target.value.toLowerCase() })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nom du pays</label>
              <input value={form.countryName} onChange={(e) => setForm({ ...form, countryName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Multiplicateur de prix (1.0 = aucun, 1.2 = +20%)</label>
              <input type="number" step="0.01" min="0.01" value={form.priceMultiplier} onChange={(e) => setForm({ ...form, priceMultiplier: parseFloat(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" checked={form.isDisabled} onChange={(e) => setForm({ ...form, isDisabled: e.target.checked })} className="w-4 h-4" id="disabled-check" />
              <label htmlFor="disabled-check" className="text-sm text-white">Désactiver ce pays</label>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={add} className="bg-primary hover:bg-primary/90 text-white">Sauvegarder</Button>
            <Button onClick={() => setShowAdd(false)} variant="outline" className="border-white/10 text-white hover:bg-white/5">Annuler</Button>
          </div>
        </div>
      )}
      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> : (
        <Table headers={["Pays", "Slug", "Multiplicateur", "Statut", "Actions"]} empty={!data?.overrides?.length}>
          {(data?.overrides ?? []).map((c: any) => (
            <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className="px-4 py-3 text-white font-medium text-sm">{c.countryName}</td>
              <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{c.countrySlug}</td>
              <td className="px-4 py-3">
                <input type="number" step="0.01" defaultValue={c.priceMultiplier} onBlur={(e) => updateMultiplier(c, e.target.value)} className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs text-center" />
              </td>
              <td className="px-4 py-3">{c.isDisabled ? <StatusBadge status="BANNED" /> : <StatusBadge status="RECEIVED" />}</td>
              <td className="px-4 py-3">
                <button onClick={() => toggle(c)} className={`p-1.5 rounded-lg ${c.isDisabled ? "text-green-400 hover:bg-green-500/10" : "text-red-400 hover:bg-red-500/10"}`} title={c.isDisabled ? "Activer" : "Désactiver"}>
                  {c.isDisabled ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: CONTACT MESSAGES
══════════════════════════════════════════════════════════════════════════════ */
function AdminContactMessages() {
  const { data, loading, refetch } = useAdminFetch<any[]>("/v1/admin/contact");
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);

  const markRead = async (id: number, isRead: boolean) => {
    await adminPatch(`/v1/admin/contact/${id}`, { isRead });
    refetch();
  };

  const remove = async (id: number) => {
    await adminDelete(`/v1/admin/contact/${id}`);
    toast({ title: "Message supprimé" });
    refetch();
  };

  const msgs = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{msgs.length} message{msgs.length !== 1 ? "s" : ""} reçu{msgs.length !== 1 ? "s" : ""}</p>
        <button onClick={refetch} className="p-2 rounded-xl border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : msgs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Aucun message de contact pour l'instant</div>
      ) : (
        <div className="space-y-3">
          {msgs.map((msg: any) => (
            <div key={msg.id} className={`rounded-2xl border bg-card/40 overflow-hidden transition-all ${msg.isRead ? "border-white/[0.06]" : "border-primary/30 bg-primary/5"}`}>
              <div className="flex items-start gap-4 p-5 cursor-pointer" onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {!msg.isRead && <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold border border-primary/30">Nouveau</span>}
                    <p className="font-semibold text-white text-sm">{msg.name}</p>
                    <span className="text-muted-foreground text-xs">·</span>
                    <p className="text-xs text-muted-foreground">{msg.email}</p>
                  </div>
                  <p className="text-sm text-white/80 font-medium">{msg.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(msg.createdAt).toLocaleString("fr-FR")}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); markRead(msg.id, !msg.isRead); }} className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-white" title={msg.isRead ? "Marquer non lu" : "Marquer lu"}>
                    <CheckCircle className={`w-4 h-4 ${msg.isRead ? "text-green-400" : ""}`} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); remove(msg.id); }} className="p-1.5 rounded-lg border border-white/10 hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {expanded === msg.id && (
                <div className="px-5 pb-5 border-t border-white/[0.06]">
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap pt-4">{msg.message}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: API WAITLIST
══════════════════════════════════════════════════════════════════════════════ */
function AdminWaitlist() {
  const { data, loading, refetch } = useAdminFetch<any[]>("/v1/admin/waitlist");
  const { toast } = useToast();

  const remove = async (id: number) => {
    await adminDelete(`/v1/admin/waitlist/${id}`);
    toast({ title: "Email supprimé" });
    refetch();
  };

  const list = data ?? [];

  const copyAll = () => {
    const text = list.map((e: any) => e.email).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: `${list.length} adresse${list.length !== 1 ? "s" : ""} copiée${list.length !== 1 ? "s" : ""}` });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{list.length} abonné{list.length !== 1 ? "s" : ""} à la liste d'attente API</p>
        <div className="flex gap-2">
          {list.length > 0 && (
            <Button onClick={copyAll} variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5 text-xs">
              Copier tous les emails
            </Button>
          )}
          <button onClick={refetch} className="p-2 rounded-xl border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Aucun abonné pour l'instant</div>
      ) : (
        <Table headers={["Email", "Date d'inscription", "Action"]} empty={false}>
          {list.map((entry: any) => (
            <tr key={entry.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3 text-white text-sm font-medium">{entry.email}</td>
              <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(entry.createdAt).toLocaleString("fr-FR")}</td>
              <td className="px-4 py-3">
                <button onClick={() => remove(entry.id)} className="p-1.5 rounded-lg border border-white/10 hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMAIL BROADCAST
══════════════════════════════════════════════════════════════════════════════ */
function AdminEmailBroadcast() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const toBase64 = (file: File): Promise<{ base64: string; mimeType: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const [meta, base64] = dataUrl.split(",");
        const mimeType = meta.match(/:(.*?);/)?.[1] ?? file.type;
        resolve({ base64, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image trop grande (max 5 Mo)");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    if (!window.confirm(`Envoyer cet email à tous les utilisateurs vérifiés ?`)) return;
    setLoading(true);
    setResult(null);
    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      if (imageFile) {
        const encoded = await toBase64(imageFile);
        imageBase64 = encoded.base64;
        imageMimeType = encoded.mimeType;
      }
      const data = await adminPost("/v1/admin/send-broadcast-email", {
        subject,
        message,
        imageBase64,
        imageMimeType,
      });
      setResult(data);
      if (data.sent > 0) {
        setSubject("");
        setMessage("");
        removeImage();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
        <p className="text-sm text-yellow-400 font-medium">⚠️ Cet email sera envoyé à tous les utilisateurs vérifiés actifs. Utilisez avec précaution.</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">Sujet de l'email</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex: Nouvelle fonctionnalité disponible !"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
        />
      </div>

      {/* Image optionnelle */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Image <span className="font-normal text-muted-foreground/60">(optionnel — affichée en haut du message)</span>
        </label>

        {imagePreview ? (
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            <img
              src={imagePreview}
              alt="Aperçu"
              className="w-full max-h-56 object-contain"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3 gap-2">
              <span className="text-xs text-white/70 flex-1 truncate">{imageFile?.name}</span>
              <button
                onClick={removeImage}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/80 text-white text-xs font-semibold hover:bg-red-500 transition-colors"
              >
                <X className="w-3 h-3" /> Supprimer
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-white/3 hover:bg-white/8 hover:border-primary/40 transition-all py-8 px-4 text-muted-foreground cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white/70">Cliquer pour importer une image</p>
              <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, GIF, WebP — max 5 Mo</p>
            </div>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Rédigez votre message ici..."
          rows={8}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground resize-none"
        />
      </div>

      <Button
        onClick={handleSend}
        disabled={loading || !subject.trim() || !message.trim()}
        className="bg-primary hover:bg-primary/90 text-white gap-2"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</>
          : <><Send className="w-4 h-4" /> Envoyer à tous les utilisateurs</>
        }
      </Button>

      {result && (
        <div className={`p-4 rounded-2xl border text-sm font-medium ${result.failed > 0 ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" : "border-green-500/30 bg-green-500/10 text-green-400"}`}>
          ✓ Email envoyé à <strong>{result.sent}</strong> utilisateur(s) sur <strong>{result.total}</strong>.
          {result.failed > 0 && ` (${result.failed} échec(s))`}
        </div>
      )}
    </div>
  );
}

// ─── AdminTelegram ────────────────────────────────────────────────────────────
function AdminTelegram() {
  const { toast } = useToast();
  const [info, setInfo]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [chatIdInput, setChatIdInput] = useState("");
  const [detecting, setDetecting]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [reporting, setReporting]   = useState(false);
  const [detectedChats, setDetectedChats] = useState<any[]>([]);

  const token = () => localStorage.getItem("zynum_token") ?? "";
  const apiFetch = (url: string, opts?: RequestInit) =>
    fetch(`${API}${url}`, { ...opts, headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(opts?.headers ?? {}) } });

  const loadInfo = async () => {
    setLoading(true);
    const r = await apiFetch("/v1/admin/telegram/info");
    const d = await r.json();
    setInfo(d);
    if (d.chatId) setChatIdInput(d.chatId);
    setLoading(false);
  };

  useEffect(() => { loadInfo(); }, []);

  const detect = async () => {
    setDetecting(true); setDetectedChats([]);
    const r = await apiFetch("/v1/admin/telegram/detect");
    const d = await r.json();
    setDetectedChats(d.chats ?? []);
    if (d.chatId && !chatIdInput) setChatIdInput(d.chatId);
    setDetecting(false);
    if (!d.chats?.length) toast({ variant: "destructive", title: "Aucun chat détecté", description: "Envoyez /chatid dans votre groupe, puis réessayez." });
  };

  const save = async () => {
    if (!chatIdInput.trim()) return;
    setSaving(true);
    const r = await apiFetch("/v1/admin/telegram/chat-id", { method: "POST", body: JSON.stringify({ chatId: chatIdInput.trim() }) });
    const d = await r.json();
    setSaving(false);
    if (d.success) { toast({ title: "Chat ID sauvegardé ✅" }); loadInfo(); }
    else toast({ variant: "destructive", title: "Erreur", description: d.message });
  };

  const test = async () => {
    setTesting(true);
    const r = await apiFetch("/v1/admin/telegram/test", { method: "POST" });
    const d = await r.json();
    setTesting(false);
    if (d.success) toast({ title: "Message de test envoyé ✅", description: `Chat ID : ${d.chatId}` });
    else toast({ variant: "destructive", title: "Échec", description: d.error ?? "Erreur" });
  };

  const report = async () => {
    setReporting(true);
    const r = await apiFetch("/v1/admin/telegram/report", { method: "POST" });
    const d = await r.json();
    setReporting(false);
    if (d.success) toast({ title: "Rapport envoyé ✅" });
    else toast({ variant: "destructive", title: "Échec", description: d.error ?? "Erreur" });
  };

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-primary/40";

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" /></div>;

  return (
    <div className="space-y-5">
      {/* Bot status */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Bot Telegram</h3>
            <p className="text-xs text-muted-foreground">Notifications en temps réel</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Token configuré</p>
            <p className={`font-semibold ${info?.hasToken ? "text-green-400" : "text-red-400"}`}>{info?.hasToken ? "✅ Oui" : "❌ Non"}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Nom du bot</p>
            <p className="font-semibold text-white">{info?.botInfo?.firstName ?? "—"} {info?.botInfo?.username ? `@${info.botInfo.username}` : ""}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Chat ID actuel</p>
            <p className="font-mono text-white">{info?.chatId ?? <span className="text-gray-500">Non configuré</span>}</p>
          </div>
        </div>
      </div>

      {/* Setup instructions */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-sm text-blue-200 space-y-1.5">
        <p className="font-semibold text-blue-300">🔧 Comment configurer</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Ajoutez le bot à votre groupe Telegram</li>
          <li>Envoyez <code className="bg-blue-500/20 px-1 rounded">/chatid</code> dans le groupe</li>
          <li>Cliquez <b>Détecter automatiquement</b> ou copiez l'ID manuellement</li>
          <li>Cliquez <b>Sauvegarder</b> puis <b>Tester la connexion</b></li>
        </ol>
      </div>

      {/* Chat ID config */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-white text-sm">Configuration du groupe</h3>
        <div className="flex gap-2">
          <input value={chatIdInput} onChange={(e) => setChatIdInput(e.target.value)} placeholder="ex: -1001234567890" className={inp} />
          <Button onClick={save} disabled={saving || !chatIdInput.trim()} className="bg-primary hover:bg-primary/80 text-white shrink-0">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sauvegarder"}
          </Button>
        </div>
        <Button onClick={detect} disabled={detecting} variant="outline" className="border-white/10 text-white hover:bg-white/10 w-full sm:w-auto">
          {detecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Détection…</> : <><RefreshCw className="w-4 h-4 mr-2" /> Détecter automatiquement</>}
        </Button>
        {detectedChats.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Groupes détectés :</p>
            {detectedChats.map((c) => (
              <button key={c.id} onClick={() => setChatIdInput(c.id)} className="w-full text-left bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm hover:bg-white/10 transition-colors">
                <span className="text-white font-medium">{c.title}</span>
                <span className="text-gray-400 ml-2 font-mono text-xs">{c.id}</span>
                <span className="text-xs text-blue-400 ml-2">[{c.type}]</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-white text-sm">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={test} disabled={testing} className="bg-green-600 hover:bg-green-500 text-white">
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Tester la connexion
          </Button>
          <Button onClick={report} disabled={reporting} className="bg-blue-600 hover:bg-blue-500 text-white">
            {reporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
            Envoyer le rapport maintenant
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Le rapport quotidien est automatiquement envoyé à <b>minuit</b> chaque jour.</p>
      </div>

      {/* What gets notified */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
        <h3 className="font-bold text-white text-sm">Notifications actives</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> Chaque dépôt reçu (OmniPay)</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> Chaque achat de numéro virtuel</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> Rapport quotidien automatique à minuit</li>
          <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> Commandes bot : /start, /aide, /stat, /chatid, /ping</li>
        </ul>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: AFFILIATE WITHDRAWALS
══════════════════════════════════════════════════════════════════════════════ */
function AdminAffiliations() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionNote, setActionNote] = useState<Record<number, string>>({});

  const query = statusFilter ? `?status=${statusFilter}&page=${page}` : `?page=${page}`;
  const { data, loading, refetch } = useAdminFetch<any>(`/v1/admin/affiliate/withdrawals${query}`, [statusFilter, page]);

  const withdrawals = data?.withdrawals ?? [];
  const total = data?.total ?? 0;

  const handleAction = async (id: number, action: "validate" | "reject") => {
    const r = await adminPost(`/v1/admin/affiliate/withdrawals/${id}/${action}`, { note: actionNote[id] ?? "" });
    if (r.withdrawal || r.success) {
      toast({ title: action === "validate" ? "Retrait validé ✅" : "Retrait rejeté" });
      refetch();
    } else {
      toast({ variant: "destructive", title: "Erreur", description: r.error ?? "Échec" });
    }
  };

  const statusMap: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    validated: "bg-green-500/20 text-green-400 border-green-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const statusLabel: Record<string, string> = { pending: "En attente", validated: "Validé", rejected: "Rejeté" };

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["", "pending", "validated", "rejected"].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${statusFilter === s ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:bg-white/5"}`}>
            {s === "" ? "Tous" : statusLabel[s] ?? s}
          </button>
        ))}
        <button onClick={refetch} className="ml-auto p-1.5 rounded-lg border border-white/10 hover:bg-white/5"><RefreshCw className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary/50" /></div>
      ) : (
        <>
          <Table headers={["#", "Utilisateur", "Montant", "Téléphone", "Pays", "Statut", "Date", "Actions"]} empty={withdrawals.length === 0}>
            {withdrawals.map((w: any) => (
              <tr key={w.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">#{w.id}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-white">{w.userName}</p>
                  <p className="text-xs text-muted-foreground">{w.userEmail}</p>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-white">${Number(w.amountUsd).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{w.phone}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{w.country}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusMap[w.status] ?? "bg-gray-500/20 text-gray-400"}`}>
                    {statusLabel[w.status] ?? w.status}
                  </span>
                  {w.note && <p className="text-xs text-muted-foreground mt-0.5">{w.note}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(w.createdAt).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3">
                  {w.status === "pending" && (
                    <div className="flex flex-col gap-1.5 min-w-[180px]">
                      <input
                        type="text"
                        placeholder="Note (optionnel)"
                        value={actionNote[w.id] ?? ""}
                        onChange={(e) => setActionNote((prev) => ({ ...prev, [w.id]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/40"
                      />
                      <div className="flex gap-1">
                        <button onClick={() => handleAction(w.id, "validate")}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-green-600/20 text-green-400 text-xs font-semibold hover:bg-green-600/30 transition-colors border border-green-500/30">
                          <Check className="w-3 h-3" /> Valider
                        </button>
                        <button onClick={() => handleAction(w.id, "reject")}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors border border-red-500/30">
                          <Ban className="w-3 h-3" /> Rejeter
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          <Pagination page={page} total={total} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  AdminCryptoPayments                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

function cryptoStatusLabel(status: string) {
  if (status === "completed") return { label: "Confirmé",   color: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)"  };
  if (status === "pending")   return { label: "En attente", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" };
  return                             { label: "Expiré",     color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)"  };
}

function CryptoBadge({ method }: { method: string }) {
  const isNP = method === "nowpayments";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 99,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
      backgroundColor: isNP ? "rgba(99,102,241,0.15)" : "rgba(251,146,60,0.15)",
      color: isNP ? "#818cf8" : "#fb923c",
      border: `1px solid ${isNP ? "rgba(99,102,241,0.3)" : "rgba(251,146,60,0.3)"}`,
    }}>
      {isNP ? "NowPayments" : "OxaPay"}
    </span>
  );
}

function AdminCryptoPayments() {
  const { toast } = useToast();
  const [page, setPage]           = useState(1);
  const [q, setQ]                 = useState("");
  const [qInput, setQInput]       = useState("");
  const [statusFilter, setStatus] = useState("");
  const [provFilter, setProv]     = useState("");
  const [checking, setChecking]   = useState<Record<number, boolean>>({});
  const [autoRefresh, setAutoRef] = useState(false);

  const params = new URLSearchParams({ page: String(page), limit: "25" });
  if (q)            params.set("q", q);
  if (statusFilter) params.set("status", statusFilter);
  if (provFilter)   params.set("provider", provFilter);

  const { data, loading, refetch } = useAdminFetch<any>(`/v1/admin/crypto-payments?${params}`, [page, q, statusFilter, provFilter]);

  const refetchRef = React.useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => refetchRef.current(), 20000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const copyText = (text: string, label = "Copié !") => {
    navigator.clipboard.writeText(text).then(() => toast({ title: label }));
  };

  const checkStatus = async (tx: any) => {
    setChecking(c => ({ ...c, [tx.id]: true }));
    try {
      const token   = localStorage.getItem("zynum_token") ?? "";
      const meta    = (() => { try { return JSON.parse(tx.metadata ?? "{}"); } catch { return {}; } })();
      let result: any;

      if (tx.method === "nowpayments") {
        const paymentId = meta.paymentId;
        if (!paymentId) { toast({ title: "Erreur", description: "paymentId introuvable dans les métadonnées", variant: "destructive" }); return; }
        const r = await fetch(`${API}/v1/payments/nowpayments/status/${paymentId}?orderId=${encodeURIComponent(tx.reference ?? "")}&userId=${tx.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        result = await r.json();
      } else {
        const trackId = meta.trackId;
        if (!trackId) { toast({ title: "Erreur", description: "trackId introuvable dans les métadonnées", variant: "destructive" }); return; }
        const r = await fetch(`${API}/v1/payments/oxapay/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ trackId, orderId: tx.reference, userId: tx.userId }),
        });
        result = await r.json();
      }

      if (result.credited) {
        toast({ title: "✅ Paiement confirmé !", description: `$${(result.amountUsd ?? 0).toFixed(2)} USD crédité.` });
      } else if (result.failed) {
        toast({ title: "❌ Paiement expiré/échoué", description: `Statut : ${result.status}`, variant: "destructive" });
      } else {
        toast({ title: `Statut : ${result.status ?? "—"}`, description: result.message ?? "En attente…" });
      }
      refetch();
    } catch (e: any) {
      toast({ title: "Erreur réseau", description: e.message, variant: "destructive" });
    } finally {
      setChecking(c => ({ ...c, [tx.id]: false }));
    }
  };

  const stats   = data?.stats ?? {};
  const txs     = data?.transactions ?? [];
  const selCls  = "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50";
  const hasFilt = q || statusFilter || provFilter;

  return (
    <div className="space-y-5">

      {/* ── Stats row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total",       val: stats.total     ?? 0, color: "#a78bfa", fmt: (v: number) => String(v) },
          { label: "En attente",  val: stats.pending   ?? 0, color: "#f59e0b", fmt: (v: number) => String(v) },
          { label: "Confirmés",   val: stats.completed ?? 0, color: "#22c55e", fmt: (v: number) => String(v) },
          { label: "Expirés",     val: stats.failed    ?? 0, color: "#ef4444", fmt: (v: number) => String(v) },
          { label: "Volume confirmé", val: Number(stats.volumeUsd ?? 0), color: "#38bdf8", fmt: (v: number) => `$${v.toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-card/40 p-4 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.fmt(Number(s.val))}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-card/40 p-4 space-y-3">
        {/* Search */}
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-1 min-w-[200px] items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { setQ(qInput); setPage(1); } }}
              placeholder="Email, nom, référence..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none"
            />
            {qInput && <button onClick={() => { setQInput(""); setQ(""); setPage(1); }} className="text-muted-foreground hover:text-white"><X className="w-3 h-3" /></button>}
          </div>
          <button onClick={() => { setQ(qInput); setPage(1); }} className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-xl text-sm text-primary font-medium hover:bg-primary/30 transition-colors">
            Rechercher
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={provFilter} onChange={e => { setProv(e.target.value); setPage(1); }} className={selCls}>
            <option value="">Tous les prestataires</option>
            <option value="nowpayments">NowPayments</option>
            <option value="oxapay">OxaPay</option>
          </select>

          <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }} className={selCls}>
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="completed">Confirmés</option>
            <option value="failed">Expirés/Échoués</option>
          </select>

          {hasFilt && (
            <button onClick={() => { setQ(""); setQInput(""); setStatus(""); setProv(""); setPage(1); }} className="text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors">
              Réinitialiser
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRef(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${autoRefresh ? "bg-green-500/15 border-green-500/30 text-green-400" : "border-white/10 text-muted-foreground hover:text-white hover:bg-white/5"}`}
            >
              <CircleDot className={`w-3 h-3 ${autoRefresh ? "animate-pulse" : ""}`} />
              {autoRefresh ? "Live" : "Auto"}
            </button>
            <button onClick={refetch} className="p-2 rounded-xl border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !txs.length ? (
        <div className="rounded-2xl border border-white/10 bg-card/40 py-16 text-center">
          <Bitcoin className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {hasFilt ? "Aucune transaction crypto ne correspond aux filtres" : "Aucune transaction crypto enregistrée"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-card/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    {["#", "Utilisateur", "Prestataire", "Montant", "Statut", "ID Paiement", "Référence", "Date", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txs.map((tx: any) => {
                    const meta  = (() => { try { return JSON.parse(tx.metadata ?? "{}"); } catch { return {}; } })();
                    const badge = cryptoStatusLabel(tx.status);
                    const payId = tx.method === "nowpayments" ? (meta.paymentId ?? "—") : (meta.trackId ?? "—");
                    const curr  = tx.method === "nowpayments" ? (meta.payCur ?? "—") : (meta.currency ?? "—");
                    const network = tx.method === "nowpayments" ? (meta.network ?? "") : "";
                    const isPending = tx.status === "pending";

                    return (
                      <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">

                        {/* ID */}
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">#{tx.id}</td>

                        {/* Utilisateur */}
                        <td className="px-4 py-3">
                          <p className="text-white text-sm font-medium leading-tight">{tx.userName ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{tx.userEmail ?? ""}</p>
                          {tx.userPhone && <p className="text-xs text-muted-foreground/60">{tx.userPhone}</p>}
                        </td>

                        {/* Prestataire + devise */}
                        <td className="px-4 py-3">
                          <CryptoBadge method={tx.method} />
                          {(curr && curr !== "—") && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {curr}{network ? ` (${network})` : ""}
                            </p>
                          )}
                        </td>

                        {/* Montant */}
                        <td className="px-4 py-3">
                          <p className="text-white font-semibold">${n(tx.amountUsd).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{Math.round(n(tx.amountFcfa)).toLocaleString("fr")} FCFA</p>
                          {meta.payAmount && <p className="text-xs text-muted-foreground/60">{meta.payAmount} {curr}</p>}
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3">
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                            backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                          }}>
                            {isPending && <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: badge.color, animation: "pulse 1.5s infinite" }} />}
                            {badge.label}
                          </span>
                        </td>

                        {/* ID Paiement */}
                        <td className="px-4 py-3">
                          {payId !== "—" ? (
                            <div className="flex items-center gap-1.5 group max-w-[130px]">
                              <span className="text-xs font-mono text-muted-foreground truncate" title={payId}>{payId}</span>
                              <button onClick={() => copyText(payId, "ID copié !")} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white flex-shrink-0">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                          {meta.payAddress && (
                            <div className="flex items-center gap-1.5 group max-w-[130px] mt-0.5">
                              <span className="text-xs font-mono text-muted-foreground/60 truncate" title={meta.payAddress}>{meta.payAddress.slice(0, 10)}…</span>
                              <button onClick={() => copyText(meta.payAddress, "Adresse copiée !")} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-muted-foreground/60 hover:text-white flex-shrink-0">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Référence */}
                        <td className="px-4 py-3">
                          {tx.reference ? (
                            <div className="flex items-center gap-1.5 group max-w-[150px]">
                              <span className="text-xs font-mono text-muted-foreground truncate" title={tx.reference}>{tx.reference}</span>
                              <button onClick={() => copyText(tx.reference, "Référence copiée !")} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white flex-shrink-0">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => checkStatus(tx)}
                            disabled={checking[tx.id]}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              background: isPending ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)",
                              borderColor: isPending ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.1)",
                              color: isPending ? "#f59e0b" : "hsl(var(--muted-foreground))",
                            }}
                            title="Vérifier le statut en temps réel"
                          >
                            {checking[tx.id]
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <RefreshCw className="w-3 h-3" />}
                            Vérifier
                          </button>
                          {meta.payLink && (
                            <a href={meta.payLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-1 text-xs text-primary/70 hover:text-primary">
                              <ExternalLink className="w-3 h-3" /> Lien
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {(data?.total ?? 0) > 25 && <Pagination page={page} total={data?.total ?? 0} limit={25} onChange={setPage} />}
        </>
      )}
    </div>
  );
}

/* ─── APP UPDATE ─────────────────────────────────────────────────────── */
function AdminAppUpdate() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    app_current_version: "1.0.0",
    app_update_mode: "disabled",
    app_update_url: "",
    app_update_title: "Mise à jour disponible",
    app_update_message: "Une nouvelle version est disponible. Veuillez mettre à jour pour continuer à utiliser ZyNum.",
  });

  useEffect(() => {
    const token = localStorage.getItem("zynum_token") ?? "";
    fetch(`${API}/v1/admin/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.settings) {
          setForm(prev => ({
            ...prev,
            ...(d.settings.app_current_version && { app_current_version: d.settings.app_current_version }),
            ...(d.settings.app_update_mode      && { app_update_mode:      d.settings.app_update_mode }),
            ...(d.settings.app_update_url       !== undefined && { app_update_url:       d.settings.app_update_url }),
            ...(d.settings.app_update_title     && { app_update_title:     d.settings.app_update_title }),
            ...(d.settings.app_update_message   && { app_update_message:   d.settings.app_update_message }),
          }));
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    const token = localStorage.getItem("zynum_token") ?? "";
    try {
      const r = await fetch(`${API}/v1/admin/settings/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: form }),
      });
      if (!r.ok) throw new Error();
      toast({ title: "Enregistré", description: "Configuration de mise à jour sauvegardée." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    }
    setSaving(false);
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const modeInfo = {
    disabled: { color: "#6B7280", bg: "#F3F4F6", label: "Désactivé", desc: "Aucune notification ne s'affiche." },
    optional: { color: "#D97706", bg: "#FFFBEB", label: "Optionnel", desc: "Un modal s'affiche, l'utilisateur peut fermer et continuer." },
    forced:   { color: "#DC2626", bg: "#FEF2F2", label: "Obligatoire", desc: "Toute l'app est bloquée. L'utilisateur DOIT mettre à jour." },
  }[form.app_update_mode as "disabled" | "optional" | "forced"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Carte mode */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "20px 20px" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Mode de mise à jour</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(["disabled", "optional", "forced"] as const).map(mode => {
            const info = {
              disabled: { color: "#6B7280", label: "Désactivé",    desc: "Aucune notification." },
              optional: { color: "#D97706", label: "Optionnel",     desc: "Modal fermable — l'utilisateur peut ignorer." },
              forced:   { color: "#DC2626", label: "Obligatoire",   desc: "Bloque toute l'app jusqu'à la mise à jour." },
            }[mode];
            const active = form.app_update_mode === mode;
            return (
              <button
                key={mode}
                onClick={() => setForm(prev => ({ ...prev, app_update_mode: mode }))}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                  borderRadius: 12, border: `2px solid ${active ? info.color : "#E5E7EB"}`,
                  background: active ? `${info.color}10` : "#fff",
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", border: `2px solid ${active ? info.color : "#D1D5DB"}`,
                  background: active ? info.color : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                }}>
                  {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: active ? info.color : "#374151", margin: "0 0 2px" }}>{info.label}</p>
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{info.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {form.app_update_mode !== "disabled" && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: modeInfo!.bg, border: `1px solid ${modeInfo!.color}30` }}>
            <p style={{ fontSize: 12, color: modeInfo!.color, margin: 0, fontWeight: 600 }}>⚠ {modeInfo!.desc}</p>
          </div>
        )}
      </div>

      {/* Carte version */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "20px 20px" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Version requise</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Version minimale (ex: 1.0.2)</label>
          <input
            value={form.app_current_version}
            onChange={f("app_current_version")}
            placeholder="1.0.0"
            style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, color: "#111827", outline: "none", fontFamily: "monospace" }}
          />
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Les utilisateurs avec une version inférieure verront la notification.</p>
        </div>
      </div>

      {/* Carte lien */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "20px 20px" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Lien de téléchargement</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>URL Play Store / App Store</label>
          <input
            value={form.app_update_url}
            onChange={f("app_update_url")}
            placeholder="https://play.google.com/store/apps/details?id=..."
            style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 13, color: "#111827", outline: "none" }}
          />
        </div>
      </div>

      {/* Carte texte */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "20px 20px" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Message affiché</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Titre</label>
            <input
              value={form.app_update_title}
              onChange={f("app_update_title")}
              placeholder="Mise à jour disponible"
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, color: "#111827", outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Message</label>
            <textarea
              value={form.app_update_message}
              onChange={f("app_update_message")}
              rows={3}
              placeholder="Description de la mise à jour..."
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 13, color: "#111827", outline: "none", resize: "vertical", lineHeight: 1.5 }}
            />
          </div>
        </div>
      </div>

      {/* Bouton sauvegarder */}
      <button
        onClick={save}
        disabled={saving}
        style={{
          padding: "14px 24px", background: saving ? "#9CA3AF" : "#4F46E5",
          color: "#fff", fontWeight: 700, fontSize: 14,
          borderRadius: 14, border: "none", cursor: saving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {saving ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Enregistrement...</> : "Enregistrer"}
      </button>
    </div>
  );
}

type AdminTab = "stats" | "users" | "orders" | "transactions" | "messages" | "settings" | "payments" | "operators" | "faq" | "social" | "countries" | "contact" | "waitlist" | "promos" | "email" | "telegram" | "affiliate" | "crypto" | "update";

const ADMIN_NAV: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: "stats",        label: "Statistiques",    icon: <BarChart3 className="w-4 h-4" /> },
  { id: "users",        label: "Utilisateurs",    icon: <Users className="w-4 h-4" /> },
  { id: "orders",       label: "Commandes",       icon: <ShoppingBag className="w-4 h-4" /> },
  { id: "transactions", label: "Transactions",    icon: <CreditCard className="w-4 h-4" /> },
  { id: "crypto",       label: "Paiements Crypto", icon: <Bitcoin className="w-4 h-4" /> },
  { id: "promos",       label: "Codes Promo",     icon: <Percent className="w-4 h-4" /> },
  { id: "messages",     label: "Messages",        icon: <MessageSquare className="w-4 h-4" /> },
  { id: "contact",      label: "Contacts",        icon: <Send className="w-4 h-4" /> },
  { id: "waitlist",     label: "Liste d'attente API", icon: <Bell className="w-4 h-4" /> },
  { id: "email",        label: "Email Broadcast", icon: <Mail className="w-4 h-4" /> },
  { id: "settings",     label: "Paramètres",      icon: <Settings className="w-4 h-4" /> },
  { id: "payments",     label: "Paiements",       icon: <Wallet className="w-4 h-4" /> },
  { id: "operators",    label: "Opérateurs",      icon: <Globe2 className="w-4 h-4" /> },
  { id: "faq",          label: "Centre d'aide",   icon: <HelpCircle className="w-4 h-4" /> },
  { id: "social",       label: "Réseaux sociaux", icon: <Share2 className="w-4 h-4" /> },
  { id: "countries",    label: "Pays",            icon: <Globe2 className="w-4 h-4" /> },
  { id: "telegram",     label: "Telegram Bot",    icon: <Bell className="w-4 h-4" /> },
  { id: "affiliate",    label: "Affiliations",    icon: <Share2 className="w-4 h-4" /> },
  { id: "update",       label: "Mises à jour",    icon: <RefreshCw className="w-4 h-4" /> },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("stats");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const current = ADMIN_NAV.find((n) => n.id === activeTab);

  const selectTab = (id: AdminTab) => { setActiveTab(id); setMobileMenuOpen(false); };

  return (
    <div style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
      {/* Admin header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: isMobile ? "10px 12px" : "12px 16px", borderRadius: 16, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.05)" }}>
        <div style={{ width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: 12, background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Shield style={{ width: isMobile ? 16 : 20, height: isMobile ? 16 : 20, color: "hsl(var(--primary))" }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: "hsl(var(--foreground))", margin: 0, lineHeight: 1.3 }}>Panneau Admin</h2>
          {!isMobile && <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0 }}>Gestion complète de la plateforme ZyNum</p>}
        </div>
        {/* Mobile: current tab selector button */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 12, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "hsl(var(--primary))", fontSize: 12, fontWeight: 600, flexShrink: 0, cursor: "pointer" }}
          >
            {current?.icon}
            <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current?.label}</span>
            <ChevronRight style={{ width: 12, height: 12, transition: "transform 0.2s", transform: mobileMenuOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
          </button>
        )}
      </div>

      {/* Mobile menu dropdown */}
      {isMobile && (
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", marginBottom: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(var(--card),0.6)", backdropFilter: "blur(8px)" }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 8 }}>
                {ADMIN_NAV.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectTab(item.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 12px", borderRadius: 12,
                      fontSize: 12, fontWeight: 500, textAlign: "left",
                      cursor: "pointer", border: "none",
                      background: activeTab === item.id ? "hsl(var(--primary))" : "transparent",
                      color: activeTab === item.id ? "#ffffff" : "hsl(var(--muted-foreground))",
                      transition: "all 0.15s",
                    }}
                  >
                    {item.icon}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Desktop Tab nav — horizontal scroll */}
      {!isMobile && (
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4, marginBottom: 20 }}>
          {ADMIN_NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 10px", borderRadius: 12,
                fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
                cursor: "pointer", border: "1px solid transparent",
                background: activeTab === item.id ? "hsl(var(--primary))" : "transparent",
                color: activeTab === item.id ? "#ffffff" : "hsl(var(--muted-foreground))",
                transition: "all 0.15s",
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Section title */}
      <div className="flex items-center gap-2 mb-4">
        <div className="text-primary shrink-0">{current?.icon}</div>
        <h3 className="text-sm sm:text-base font-bold text-white truncate">{current?.label}</h3>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {activeTab === "stats"        && <AdminStats />}
          {activeTab === "users"        && <AdminUsers />}
          {activeTab === "orders"       && <AdminOrders />}
          {activeTab === "transactions" && <AdminTransactions />}
          {activeTab === "crypto"       && <AdminCryptoPayments />}
          {activeTab === "promos"       && <AdminDiscountCodes />}
          {activeTab === "messages"     && <AdminMessages />}
          {activeTab === "contact"      && <AdminContactMessages />}
          {activeTab === "waitlist"     && <AdminWaitlist />}
          {activeTab === "email"        && <AdminEmailBroadcast />}
          {activeTab === "settings"     && <AdminSettings />}
          {activeTab === "payments"     && <AdminPayments />}
          {activeTab === "operators"    && <AdminOperatorRoutes />}
          {activeTab === "faq"          && <AdminFaq />}
          {activeTab === "social"       && <AdminSocialLinks />}
          {activeTab === "countries"    && <AdminCountries />}
          {activeTab === "telegram"     && <AdminTelegram />}
          {activeTab === "affiliate"    && <AdminAffiliations />}
          {activeTab === "update"       && <AdminAppUpdate />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
