/**
 * @fileoverview Discotive OS — GitHub Connector v2.0 (PRODUCTION)
 * @module Vault/Connectors/GitHub
 *
 * DATA FLOW:
 * 1. User enters GitHub username → calls public GitHub REST API (no OAuth, no token required)
 * 2. Repos, activity (events-based), and aggregated language stats fetched concurrently
 * 3. "Sync Repo" writes a vault asset (PENDING) for admin review pipeline
 * 4. Connected state persisted to Firestore: users/{uid}.connectors.github
 *
 * RATE LIMIT STRATEGY:
 * - GitHub unauthenticated: 60 req/hr per IP. We make 3 concurrent calls per connect.
 * - On 403/429: Surface a user-friendly cooldown message with retry guidance.
 * - On 404: Clear "user not found" error.
 *
 * SECURITY:
 * - No access tokens stored anywhere in this component or Firestore
 * - Vault write is client-side arrayUnion guarded by Firestore rules (owner-only)
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github,
  GitBranch,
  Star,
  GitFork,
  Activity,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Upload,
  Check,
  X,
  Lock,
  Unlock,
  BookOpen,
  BarChart2,
  TrendingUp,
  RefreshCw,
  Info,
  Zap,
} from "lucide-react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../contexts/AuthContext";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

// ─── Language Color Registry ──────────────────────────────────────────────────
const LANG_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Shell: "#89e051",
  SCSS: "#c6538c",
  "Jupyter Notebook": "#DA5B0B",
  "C#": "#178600",
  PHP: "#4F5D95",
  R: "#198ce7",
  Scala: "#c22d40",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Lua: "#000080",
  Clojure: "#db5855",
};

// ─── GitHub Commit Activity Heatmap ──────────────────────────────────────────
const CommitHeatmap = memo(({ weeks = [] }) => {
  if (!weeks.length) return null;
  const flat = weeks.flatMap((w) => w.days || []);
  const max = Math.max(...flat, 1);
  const totalCommits = flat.reduce((s, d) => s + d, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: T.dim }}
        >
          Commit Activity — Last 52 Weeks
        </p>
        <span
          className="text-[9px] font-mono font-bold"
          style={{ color: G.base }}
        >
          {totalCommits.toLocaleString()} commits
        </span>
      </div>
      <div
        className="flex gap-[3px] overflow-hidden"
        style={{ maxWidth: "100%" }}
      >
        {weeks.slice(-52).map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {(week.days || Array(7).fill(0)).map((count, di) => {
              const intensity =
                count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
              const bg = [
                "rgba(255,255,255,0.04)",
                "rgba(191,162,100,0.18)",
                "rgba(191,162,100,0.38)",
                "rgba(191,162,100,0.62)",
                "#D4AF78",
              ][intensity];
              return (
                <motion.div
                  key={di}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (wi * 7 + di) * 0.0008, duration: 0.2 }}
                  title={`${count} commit${count !== 1 ? "s" : ""}`}
                  className="rounded-[2px]"
                  style={{ width: 9, height: 9, background: bg }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[8px]" style={{ color: T.dim }}>
          Less
        </span>
        <div className="flex gap-[3px]">
          {[
            "rgba(255,255,255,0.04)",
            "rgba(191,162,100,0.18)",
            "rgba(191,162,100,0.38)",
            "rgba(191,162,100,0.62)",
            "#D4AF78",
          ].map((c, i) => (
            <div
              key={i}
              className="rounded-[2px]"
              style={{ width: 9, height: 9, background: c }}
            />
          ))}
        </div>
        <span className="text-[8px]" style={{ color: T.dim }}>
          More
        </span>
      </div>
    </div>
  );
});

// ─── Language Distribution Bar ────────────────────────────────────────────────
const LanguageBar = memo(({ languages }) => {
  const entries = Object.entries(languages || {});
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return null;
  const sorted = entries.sort(([, a], [, b]) => b - a).slice(0, 8);

  return (
    <div>
      <p
        className="text-[9px] font-black uppercase tracking-widest mb-3"
        style={{ color: T.dim }}
      >
        Language Distribution
      </p>
      <div className="flex rounded-full overflow-hidden h-2 mb-3">
        {sorted.map(([lang, bytes]) => (
          <motion.div
            key={lang}
            initial={{ width: 0 }}
            animate={{ width: `${(bytes / total) * 100}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: LANG_COLORS[lang] || "#4a4a4a" }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {sorted.map(([lang, bytes]) => (
          <div key={lang} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: LANG_COLORS[lang] || "#4a4a4a" }}
            />
            <span
              className="text-[9px] font-bold truncate"
              style={{ color: T.secondary }}
            >
              {lang}
            </span>
            <span
              className="text-[8px] font-mono ml-auto"
              style={{ color: T.dim }}
            >
              {((bytes / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ─── Stat Badge ───────────────────────────────────────────────────────────────
const StatBadge = memo(({ icon: Icon, label, value, color }) => (
  <div
    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border"
    style={{ background: `${color}0A`, borderColor: `${color}20` }}
  >
    <Icon className="w-4 h-4" style={{ color }} />
    <span
      className="text-base font-black font-mono leading-none"
      style={{ color }}
    >
      {typeof value === "number" ? value.toLocaleString() : value}
    </span>
    <span
      className="text-[8px] font-bold uppercase tracking-widest text-center leading-tight"
      style={{ color: T.dim }}
    >
      {label}
    </span>
  </div>
));

// ─── Repository Card ──────────────────────────────────────────────────────────
const RepoCard = memo(({ repo, onSync, synced, syncing }) => {
  const langColor = LANG_COLORS[repo.language] || "#4a4a4a";
  const updatedAgo = (() => {
    const days = Math.floor(
      (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000,
    );
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}yr ago`;
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col gap-3 p-4 rounded-[1.25rem] border transition-all group"
      style={{
        background: synced ? "rgba(16,185,129,0.04)" : V.surface,
        borderColor: synced ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {repo.private ? (
              <Lock className="w-3 h-3 shrink-0" style={{ color: "#f59e0b" }} />
            ) : (
              <Unlock className="w-3 h-3 shrink-0" style={{ color: T.dim }} />
            )}
            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-black truncate hover:underline"
              style={{ color: T.primary }}
              onClick={(e) => e.stopPropagation()}
            >
              {repo.name}
            </a>
          </div>
          {repo.description && (
            <p
              className="text-[10px] leading-relaxed line-clamp-2"
              style={{ color: T.secondary }}
            >
              {repo.description}
            </p>
          )}
        </div>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noreferrer"
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(255,255,255,0.04)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3.5 h-3.5" style={{ color: T.dim }} />
        </a>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        {repo.language && (
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: langColor }}
            />
            <span
              className="text-[9px] font-bold"
              style={{ color: T.secondary }}
            >
              {repo.language}
            </span>
          </div>
        )}
        {repo.stargazers_count > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" style={{ color: "#f59e0b" }} />
            <span
              className="text-[9px] font-bold"
              style={{ color: T.secondary }}
            >
              {repo.stargazers_count}
            </span>
          </div>
        )}
        {repo.forks_count > 0 && (
          <div className="flex items-center gap-1">
            <GitFork className="w-3 h-3" style={{ color: T.dim }} />
            <span
              className="text-[9px] font-bold"
              style={{ color: T.secondary }}
            >
              {repo.forks_count}
            </span>
          </div>
        )}
        <span className="text-[8px] ml-auto font-mono" style={{ color: T.dim }}>
          {updatedAgo}
        </span>
      </div>

      {/* Topics */}
      {repo.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {repo.topics.slice(0, 4).map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded-md text-[8px] font-bold"
              style={{
                background: "rgba(56,189,248,0.08)",
                border: "1px solid rgba(56,189,248,0.15)",
                color: "#38bdf8",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Sync CTA */}
      <motion.button
        whileHover={{ scale: synced ? 1 : 1.02 }}
        whileTap={{ scale: synced ? 1 : 0.97 }}
        onClick={() => !synced && !syncing && onSync(repo)}
        disabled={synced || syncing}
        className="flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
        style={
          synced
            ? {
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#10b981",
                cursor: "default",
              }
            : {
                background: G.dimBg,
                border: `1px solid ${G.border}`,
                color: G.bright,
              }
        }
      >
        {syncing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : synced ? (
          <>
            <Check className="w-3.5 h-3.5" /> Synced to Vault
          </>
        ) : (
          <>
            <Upload className="w-3.5 h-3.5" /> Sync to Vault
          </>
        )}
      </motion.button>
    </motion.div>
  );
});

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
const ConnectorSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div
      className="h-24 rounded-[1.25rem]"
      style={{ background: "rgba(255,255,255,0.03)" }}
    />
    <div className="grid grid-cols-4 gap-2">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-20 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)" }}
        />
      ))}
    </div>
    <div
      className="h-40 rounded-[1.25rem]"
      style={{ background: "rgba(255,255,255,0.03)" }}
    />
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-44 rounded-[1.25rem]"
          style={{ background: "rgba(255,255,255,0.03)" }}
        />
      ))}
    </div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const GitHubConnector = ({ userData, onVaultAssetAdded, addToast }) => {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  const [phase, setPhase] = useState("idle"); // idle | fetching | connected | error
  const [inputUsername, setInputUsername] = useState("");
  const [githubData, setGithubData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncedRepos, setSyncedRepos] = useState(new Set());
  const [syncingRepoId, setSyncingRepoId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [rateLimitReset, setRateLimitReset] = useState(null);

  // ── Restore persisted state on mount ──────────────────────────────────────
  useEffect(() => {
    const existing = userData?.connectors?.github;
    if (existing?.username) {
      setInputUsername(existing.username);
      setPhase("fetching");
      fetchGitHubData(existing.username);
    }
    // Restore already-synced repos from vault
    if (userData?.vault?.length) {
      const synced = new Set(
        userData.vault
          .filter((a) => a.connectorSource === "github" && a.connectorRepoId)
          .map((a) => a.connectorRepoId),
      );
      setSyncedRepos(synced);
    }
  }, []); // Run once on mount only

  // ── GitHub API Fetch ──────────────────────────────────────────────────────
  const fetchGitHubData = useCallback(
    async (username) => {
      setLoading(true);
      setError(null);

      try {
        const headers = {
          Accept: "application/vnd.github.v3+json",
          // NOTE: No Authorization header — public API only. 60 req/hr unauthenticated.
          // For production scale, set a GITHUB_TOKEN secret in Vercel env and proxy through a Cloud Function.
        };

        const [userRes, reposRes, eventsRes] = await Promise.all([
          fetch(`https://api.github.com/users/${username}`, { headers }),
          fetch(
            `https://api.github.com/users/${username}/repos?per_page=100&sort=pushed&type=owner`,
            { headers },
          ),
          fetch(
            `https://api.github.com/users/${username}/events/public?per_page=100`,
            { headers },
          ),
        ]);

        // Rate limit detection
        if (userRes.status === 403 || userRes.status === 429) {
          const resetHeader = userRes.headers.get("X-RateLimit-Reset");
          if (resetHeader) {
            const resetMs = parseInt(resetHeader) * 1000;
            setRateLimitReset(resetMs);
            const minutesLeft = Math.ceil((resetMs - Date.now()) / 60000);
            throw new Error(
              `GitHub API rate limit exceeded. Resets in ~${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.`,
            );
          }
          throw new Error(
            "GitHub API rate limit exceeded. Please try again shortly.",
          );
        }

        if (userRes.status === 404) {
          throw new Error(
            `GitHub user "@${username}" not found. Check the username and try again.`,
          );
        }

        if (!userRes.ok) {
          throw new Error(
            `GitHub API error (${userRes.status}). Please try again.`,
          );
        }

        const [user, repos, events] = await Promise.all([
          userRes.json(),
          reposRes.ok ? reposRes.json() : [],
          eventsRes.ok ? eventsRes.json() : [],
        ]);

        // Validate repos is actually an array (rate limit can return an object)
        const repoList = Array.isArray(repos) ? repos : [];

        // ── Aggregate language stats from all repos ──────────────────────────
        const languages = {};
        repoList.forEach((repo) => {
          if (repo.language && !repo.fork) {
            languages[repo.language] =
              (languages[repo.language] || 0) + (repo.size || 1);
          }
        });

        // ── Build commit activity heatmap from events (52 weeks) ──────────────
        // GitHub's /stats/commit_activity requires auth. We build from public events instead.
        const now = Date.now();
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
        const commitDayMap = new Map(); // "YYYY-MM-DD" -> count

        (Array.isArray(events) ? events : []).forEach((event) => {
          if (event.type === "PushEvent" && event.payload?.commits) {
            const date = event.created_at?.split("T")[0];
            if (date) {
              const eventMs = new Date(date).getTime();
              if (now - eventMs <= ONE_YEAR_MS) {
                commitDayMap.set(
                  date,
                  (commitDayMap.get(date) || 0) + event.payload.commits.length,
                );
              }
            }
          }
        });

        // Build 52-week grid (Sun→Sat)
        const weeks = [];
        const startDate = new Date(now - ONE_YEAR_MS);
        // Align to Sunday
        startDate.setDate(startDate.getDate() - startDate.getDay());
        for (let w = 0; w < 53; w++) {
          const days = [];
          for (let d = 0; d < 7; d++) {
            const date = new Date(startDate.getTime() + (w * 7 + d) * 86400000);
            const key = date.toISOString().split("T")[0];
            days.push(commitDayMap.get(key) || 0);
          }
          weeks.push({ days });
        }

        setGithubData({ user, repos: repoList, activity: weeks, languages });

        // Persist connection to Firestore
        if (uid) {
          await updateDoc(doc(db, "users", uid), {
            "connectors.github": {
              username: user.login,
              displayName: user.name || user.login,
              avatarUrl: user.avatar_url,
              profileUrl: user.html_url,
              connectedAt: new Date().toISOString(),
              publicRepos: user.public_repos,
              followers: user.followers,
            },
          });
        }

        setPhase("connected");
      } catch (err) {
        console.error("[GitHubConnector] Fetch failed:", err);
        setError(err.message || "Failed to connect to GitHub.");
        setPhase("error");
      } finally {
        setLoading(false);
      }
    },
    [uid],
  );

  // ── Connect handler ───────────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    const username = inputUsername
      .trim()
      .replace(/^@/, "")
      .replace(/^https?:\/\/(www\.)?github\.com\//, "")
      .split("/")[0];
    if (!username) return;
    setPhase("fetching");
    await fetchGitHubData(username);
  }, [inputUsername, fetchGitHubData]);

  // ── Disconnect handler ────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "users", uid), { "connectors.github": null });
      setPhase("idle");
      setGithubData(null);
      setInputUsername("");
      setSyncedRepos(new Set());
      setError(null);
      addToast?.("GitHub disconnected.", "grey");
    } catch (err) {
      addToast?.("Disconnect failed. Try again.", "red");
    }
  }, [uid, addToast]);

  // ── Refresh data ──────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (githubData?.user?.login) {
      fetchGitHubData(githubData.user.login);
    }
  }, [githubData, fetchGitHubData]);

  // ── Sync repo → Vault ─────────────────────────────────────────────────────
  const handleSyncRepo = useCallback(
    async (repo) => {
      if (!uid || syncedRepos.has(repo.id) || syncingRepoId) return;
      setSyncingRepoId(repo.id);
      try {
        const newAsset = {
          id: `vault_github_${repo.id}_${Date.now()}`,
          title: repo.full_name,
          subtitle: repo.description || "",
          category: "Project",
          type: "github_repo",
          url: repo.html_url,
          isPublic: !repo.private,
          pinned: false,
          status: "PENDING",
          strength: null,
          scoreYield: 0,
          connectorSource: "github",
          connectorRepoId: repo.id,
          credentials: {
            repository: repo.html_url,
            description: repo.description || "",
            language: repo.language || "Mixed",
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            topics: repo.topics || [],
            lastUpdated: repo.pushed_at?.split("T")[0] || "",
            isForked: repo.fork,
          },
          uploadedAt: new Date().toISOString(),
          uploadedBy: uid,
          hash: `gh_${repo.id}`,
          size: 0,
        };

        const currentVault = userData?.vault || [];

        // Guard: don't duplicate
        const alreadyExists = currentVault.some(
          (a) => a.connectorRepoId === repo.id,
        );
        if (alreadyExists) {
          setSyncedRepos((prev) => new Set([...prev, repo.id]));
          setSyncingRepoId(null);
          return;
        }

        const updatedVault = [...currentVault, newAsset];
        await updateDoc(doc(db, "users", uid), {
          vault: updatedVault,
          vault_count: updatedVault.length,
        });

        setSyncedRepos((prev) => new Set([...prev, repo.id]));
        onVaultAssetAdded?.(newAsset, updatedVault);
        addToast?.(
          `"${repo.name}" synced to Vault — pending admin verification.`,
          "green",
        );
      } catch (err) {
        console.error("[GitHubConnector] Sync failed:", err);
        addToast?.("Sync failed. Check your connection and try again.", "red");
      } finally {
        setSyncingRepoId(null);
      }
    },
    [uid, userData, syncedRepos, syncingRepoId, onVaultAssetAdded, addToast],
  );

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!githubData) return null;
    const { repos, activity } = githubData;
    return {
      totalStars: repos.reduce((s, r) => s + (r.stargazers_count || 0), 0),
      totalForks: repos.reduce((s, r) => s + (r.forks_count || 0), 0),
      publicRepos: repos.filter((r) => !r.fork).length,
      totalCommits: activity.flatMap((w) => w.days).reduce((s, d) => s + d, 0),
    };
  }, [githubData]);

  const tabs = useMemo(
    () => [
      { key: "overview", label: "Overview" },
      { key: "repos", label: `Repos (${githubData?.repos?.length || 0})` },
      { key: "activity", label: "Activity" },
    ],
    [githubData?.repos?.length],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: IDLE / ERROR STATE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "idle" || phase === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[420px] text-center px-6"
      >
        <motion.div
          className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6"
          style={{
            background: "rgba(226,232,240,0.06)",
            border: "1px solid rgba(226,232,240,0.12)",
          }}
          animate={{
            boxShadow: [
              "0 0 0px rgba(226,232,240,0)",
              "0 0 30px rgba(226,232,240,0.08)",
              "0 0 0px rgba(226,232,240,0)",
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Github className="w-10 h-10" style={{ color: "#e2e8f0" }} />
        </motion.div>

        <h2
          className="text-2xl font-black mb-2"
          style={{ fontFamily: "'Montserrat', sans-serif", color: T.primary }}
        >
          Connect GitHub
        </h2>
        <p
          className="text-sm mb-8 max-w-sm leading-relaxed"
          style={{ color: T.secondary }}
        >
          Import your repos, visualize your commit activity heatmap, and sync
          projects directly to your Vault for admin verification.
        </p>

        <AnimatePresence>
          {phase === "error" && error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 px-4 py-3 rounded-xl mb-6 w-full max-w-sm text-left"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <AlertTriangle
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: "#f87171" }}
              />
              <p className="text-xs font-bold" style={{ color: "#f87171" }}>
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-sm space-y-3">
          <div className="relative">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold select-none"
              style={{ color: T.dim }}
            >
              @
            </span>
            <input
              type="text"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              placeholder="your-github-username"
              className="w-full pl-8 pr-4 py-3.5 rounded-xl text-sm font-bold focus:outline-none transition-all"
              style={{
                background: V.surface,
                border: `1px solid ${inputUsername ? G.border : "rgba(255,255,255,0.07)"}`,
                color: T.primary,
              }}
              autoFocus
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleConnect}
            disabled={!inputUsername.trim()}
            className="w-full py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            style={{
              background: `linear-gradient(135deg, ${G.deep}, ${G.bright})`,
              color: "#0a0a0a",
            }}
          >
            <Github className="w-4 h-4" />
            Connect Profile
          </motion.button>
        </div>

        <div className="flex items-center gap-1.5 mt-4">
          <Info className="w-3 h-3" style={{ color: T.dim }} />
          <p className="text-[9px]" style={{ color: T.dim }}>
            Uses the public GitHub API. No login or access token required.
          </p>
        </div>
      </motion.div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "fetching" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2"
          style={{
            borderColor: `${G.base} transparent transparent transparent`,
          }}
        />
        <div className="text-center">
          <p className="text-sm font-black" style={{ color: T.primary }}>
            Connecting to GitHub...
          </p>
          <p className="text-[10px] mt-1" style={{ color: T.dim }}>
            Fetching repos, events & language stats
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: CONNECTED STATE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "connected" && githubData && stats) {
    const { user, repos, activity, languages } = githubData;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-0"
      >
        {/* Connected Profile Banner */}
        <div
          className="relative flex items-center gap-4 p-5 rounded-[1.25rem] mb-5 overflow-hidden"
          style={{
            background: "rgba(226,232,240,0.04)",
            border: "1px solid rgba(226,232,240,0.1)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 0% 50%, rgba(226,232,240,0.04) 0%, transparent 60%)",
            }}
          />
          <img
            src={user.avatar_url}
            alt={user.login}
            className="w-14 h-14 rounded-full border-2 shrink-0 relative z-10"
            style={{ borderColor: "rgba(226,232,240,0.2)" }}
          />
          <div className="flex-1 min-w-0 relative z-10">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="text-base font-black" style={{ color: T.primary }}>
                {user.name || user.login}
              </h3>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "#10b981" }}
                />
                <span
                  className="text-[8px] font-black uppercase tracking-widest"
                  style={{ color: "#10b981" }}
                >
                  Connected
                </span>
              </div>
            </div>
            <p className="text-xs font-mono mb-1" style={{ color: T.dim }}>
              @{user.login}
            </p>
            {user.bio && (
              <p
                className="text-[11px] line-clamp-1"
                style={{ color: T.secondary }}
              >
                {user.bio}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 relative z-10">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              title="Refresh data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                style={{ color: G.base }}
              />
            </button>
            <a
              href={user.html_url}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" style={{ color: T.dim }} />
            </a>
            <button
              onClick={handleDisconnect}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/10"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              title="Disconnect GitHub"
            >
              <X className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <StatBadge
            icon={BookOpen}
            label="Repos"
            value={stats.publicRepos}
            color="#e2e8f0"
          />
          <StatBadge
            icon={Star}
            label="Total Stars"
            value={stats.totalStars}
            color="#f59e0b"
          />
          <StatBadge
            icon={GitFork}
            label="Total Forks"
            value={stats.totalForks}
            color="#38bdf8"
          />
          <StatBadge
            icon={Activity}
            label="Commits (1yr)"
            value={stats.totalCommits}
            color="#10b981"
          />
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 mb-5 p-1 rounded-xl"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              style={{
                background:
                  activeTab === tab.key
                    ? "rgba(255,255,255,0.07)"
                    : "transparent",
                color: activeTab === tab.key ? T.primary : T.dim,
                border:
                  activeTab === tab.key
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div
                className="p-4 rounded-[1.25rem]"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <LanguageBar languages={languages} />
              </div>
              <div
                className="p-4 rounded-[1.25rem]"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <CommitHeatmap weeks={activity} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p
                    className="text-[9px] font-black uppercase tracking-widest"
                    style={{ color: T.dim }}
                  >
                    Top Repositories
                  </p>
                  <button
                    onClick={() => setActiveTab("repos")}
                    className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
                    style={{ color: G.base }}
                  >
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {repos.slice(0, 4).map((repo) => (
                    <RepoCard
                      key={repo.id}
                      repo={repo}
                      onSync={handleSyncRepo}
                      synced={syncedRepos.has(repo.id)}
                      syncing={syncingRepoId === repo.id}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "repos" && (
            <motion.div
              key="repos"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {repos.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-16 text-center"
                  style={{
                    border: "1px dashed rgba(255,255,255,0.06)",
                    borderRadius: "1.25rem",
                  }}
                >
                  <BookOpen
                    className="w-10 h-10 mb-3"
                    style={{ color: "rgba(255,255,255,0.08)" }}
                  />
                  <p
                    className="text-sm font-black"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  >
                    No public repositories found.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {repos.map((repo) => (
                    <RepoCard
                      key={repo.id}
                      repo={repo}
                      onSync={handleSyncRepo}
                      synced={syncedRepos.has(repo.id)}
                      syncing={syncingRepoId === repo.id}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div
                className="p-5 rounded-[1.25rem]"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <CommitHeatmap weeks={activity} />
              </div>
              <div
                className="p-5 rounded-[1.25rem]"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <LanguageBar languages={languages} />
              </div>
              {/* Extra stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Followers",
                    value: user.followers,
                    color: "#a855f7",
                  },
                  {
                    label: "Following",
                    value: user.following,
                    color: "#38bdf8",
                  },
                  { label: "Gists", value: user.public_gists, color: G.base },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="p-4 rounded-xl flex flex-col items-center gap-1"
                    style={{
                      background: `${color}0A`,
                      border: `1px solid ${color}20`,
                    }}
                  >
                    <span
                      className="text-xl font-black font-mono"
                      style={{ color }}
                    >
                      {value?.toLocaleString() || 0}
                    </span>
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest"
                      style={{ color: T.dim }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              {user.company && (
                <div
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: V.surface,
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <BarChart2
                    className="w-4 h-4 shrink-0"
                    style={{ color: G.base }}
                  />
                  <span
                    className="text-xs font-bold"
                    style={{ color: T.secondary }}
                  >
                    {user.company}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Synced count footer */}
        {syncedRepos.size > 0 && (
          <div
            className="flex items-center gap-2 mt-4 p-3 rounded-xl"
            style={{
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.15)",
            }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: "#10b981" }}
            >
              {syncedRepos.size} repo{syncedRepos.size !== 1 ? "s" : ""} synced
              to Vault — awaiting admin verification
            </span>
          </div>
        )}
      </motion.div>
    );
  }

  return null;
};

export default GitHubConnector;
