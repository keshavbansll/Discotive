/**
 * @fileoverview Discotive OS — Opportunity Detail Page
 * Route: /app/opportunities/:type/:id
 */

import React, { useState, useEffect, memo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../lib/cn";
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Laptop,
  Zap,
  Trophy,
  Star,
  Users,
  DollarSign,
  FlaskConical,
  Globe,
  MapPin,
  Clock,
  Calendar,
  Target,
  Building2,
  Shield,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Share2,
  Copy,
  Check,
  ChevronRight,
  Layers,
  Sparkles,
  Award,
} from "lucide-react";
import { OppCard } from "./Opportunities";

const TYPE_CONFIG = {
  job: {
    color: "#BFA264",
    bg: "rgba(191,162,100,0.1)",
    border: "rgba(191,162,100,0.25)",
    icon: Briefcase,
  },
  internship: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.25)",
    icon: GraduationCap,
  },
  freelance: {
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.1)",
    border: "rgba(56,189,248,0.25)",
    icon: Laptop,
  },
  hackathon: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    icon: Zap,
  },
  competition: {
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.25)",
    icon: Trophy,
  },
  fest: {
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
    border: "rgba(236,72,153,0.25)",
    icon: Star,
  },
  mentorship: {
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.25)",
    icon: Users,
  },
  grant: {
    color: "#4ade80",
    bg: "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.25)",
    icon: DollarSign,
  },
  research: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.25)",
    icon: FlaskConical,
  },
};

const timeLeft = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  if (diff < 0) return "Closed";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Closes Today";
  if (days === 1) return "1 day left";
  if (days < 7) return `${days} days left`;
  if (days < 30) return `${Math.floor(days / 7)} weeks left`;
  return `${Math.floor(days / 30)} months left`;
};

const calcProbability = (oppTags = [], vaultAssets = [], userSkills = []) => {
  if (!oppTags || oppTags.length === 0) return null;
  const userTagSet = new Set([
    ...userSkills.map((s) => s.toLowerCase()),
    ...vaultAssets
      .filter((a) => a.status === "VERIFIED")
      .flatMap((a) =>
        (a.credentials?.techStack || "")
          .split(",")
          .map((t) => t.trim().toLowerCase()),
      ),
  ]);
  const matched = oppTags.filter((t) => userTagSet.has(t.toLowerCase())).length;
  const pct = Math.round((matched / oppTags.length) * 100);
  if (pct >= 75)
    return { pct, tier: "strong", color: "#4ade80", label: "Strong" };
  if (pct >= 50)
    return { pct, tier: "medium", color: "#f59e0b", label: "Medium" };
  return { pct, tier: "weak", color: "#F87171", label: "Weak" };
};

const OpportunityDetail = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { userData } = useUserData();
  const [opp, setOpp] = useState(null);
  const [relatedOpps, setRelatedOpps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const userSkills = userData?.skills?.alignedSkills || [];
  const vaultAssets = userData?.vault || [];

  useEffect(() => {
    const fetchOpp = async () => {
      setIsLoading(true);
      try {
        const snap = await getDoc(doc(db, "opportunities", id));
        if (!snap.exists()) {
          navigate("/app/opportunities");
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        setOpp(data);
        // Fetch related
        const relSnap = await getDocs(
          query(
            collection(db, "opportunities"),
            where("type", "==", data.type || type),
            orderBy("createdAt", "desc"),
            limit(4),
          ),
        );
        setRelatedOpps(
          relSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((r) => r.id !== id),
        );
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchOpp();
  }, [id, type, navigate]);

  if (isLoading)
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#BFA264]/40" />
      </div>
    );

  if (!opp)
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-10 h-10 text-red-400/50" />
        <p className="text-white/40 text-sm">Opportunity not found.</p>
        <button
          onClick={() => navigate("/app/opportunities")}
          className="px-6 py-3 bg-[#BFA264] text-black font-black text-[10px] uppercase tracking-widest rounded-xl"
        >
          Back to Opportunities
        </button>
      </div>
    );

  const cfg = TYPE_CONFIG[opp.type] || TYPE_CONFIG.job;
  const Icon = cfg.icon;
  const prob = calcProbability(opp.requiredTags || [], vaultAssets, userSkills);
  const tl = timeLeft(opp.closingDate);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#030303] min-h-screen text-white pb-28">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: "55vh" }}>
        {opp.thumbnailUrl ? (
          <img
            src={opp.thumbnailUrl}
            alt={opp.title}
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 50%, ${cfg.color}20 0%, transparent 60%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 py-8">
          {/* Back */}
          <button
            onClick={() => navigate("/app/opportunities")}
            className="flex items-center gap-2 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Opportunities
          </button>

          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
                style={{
                  background: cfg.bg,
                  borderColor: cfg.border,
                  color: cfg.color,
                }}
              >
                <Icon className="w-2.5 h-2.5" /> {opp.type}
              </div>
              {tl && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-[9px] text-white/50">
                  <Clock className="w-2.5 h-2.5" /> {tl}
                </div>
              )}
              {opp.featured && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#BFA264]/10 border border-[#BFA264]/25 text-[9px] font-black text-[#BFA264]">
                  <Sparkles className="w-2.5 h-2.5" /> Featured
                </div>
              )}
            </div>

            <h1
              className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-4"
              style={{ letterSpacing: "-0.03em" }}
            >
              {opp.title}
            </h1>

            <div className="flex items-center gap-3 mb-6">
              {opp.providerLogoUrl && (
                <img
                  src={opp.providerLogoUrl}
                  alt={opp.provider}
                  className="w-10 h-10 rounded-xl object-contain bg-white/5 border border-white/10 p-1"
                />
              )}
              <div>
                <p className="text-sm font-bold text-white/70">
                  {opp.provider}
                </p>
                {opp.isVerified && (
                  <div className="flex items-center gap-1 text-[9px] font-black text-[#BFA264]">
                    <Shield className="w-2.5 h-2.5" /> Verified Organization
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {opp.applyUrl && (
                <a
                  href={opp.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-7 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-full text-black"
                  style={{
                    background: `linear-gradient(135deg, #8B7240, #D4AF78)`,
                    boxShadow: "0 0 30px rgba(191,162,100,0.2)",
                  }}
                >
                  Apply Now <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-5 py-3.5 font-black text-[10px] uppercase tracking-widest rounded-full bg-white/5 border border-white/10 hover:border-white/25 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            {opp.description && (
              <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] p-6">
                <h2 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">
                  About This Opportunity
                </h2>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  {opp.description}
                </p>
              </div>
            )}

            {/* Required Stack */}
            {opp.requiredTags && opp.requiredTags.length > 0 && (
              <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] p-6">
                <h2 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">
                  Required Stack
                </h2>
                <div className="flex flex-wrap gap-2">
                  {opp.requiredTags.map((tag) => {
                    const userTagSet = new Set(
                      userSkills.map((s) => s.toLowerCase()),
                    );
                    const hasTag = userTagSet.has(tag.toLowerCase());
                    return (
                      <span
                        key={tag}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5",
                          hasTag
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                            : "bg-white/[0.03] border-white/[0.06] text-white/40",
                        )}
                      >
                        {hasTag && <Check className="w-3 h-3" />}
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Perks */}
            {opp.perks && opp.perks.length > 0 && (
              <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] p-6">
                <h2 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">
                  Perks & Benefits
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {opp.perks.map((perk) => (
                    <div
                      key={perk}
                      className="flex items-center gap-3 p-3 bg-[#BFA264]/5 border border-[#BFA264]/15 rounded-xl"
                    >
                      <Zap className="w-4 h-4 text-[#BFA264] shrink-0" />
                      <span className="text-sm text-white/70">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related */}
            {relatedOpps.length > 0 && (
              <div>
                <h2 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">
                  Related Opportunities
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedOpps.map((r) => (
                    <div
                      key={r.id}
                      onClick={() =>
                        navigate(`/app/opportunities/${r.type}/${r.id}`)
                      }
                      className="group p-4 bg-[#0a0a0a] border border-white/[0.05] hover:border-[#BFA264]/30 rounded-2xl cursor-pointer transition-all"
                    >
                      <p className="text-sm font-black text-white group-hover:text-[#D4AF78] transition-colors line-clamp-2 mb-1">
                        {r.title}
                      </p>
                      <p className="text-[10px] text-white/30">{r.provider}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Probability */}
            {prob && (
              <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] p-5">
                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">
                  Probability Percentile
                </p>
                <div className="flex items-end gap-3 mb-3">
                  <span
                    className="text-5xl font-black font-mono leading-none"
                    style={{ color: prob.color }}
                  >
                    {prob.pct}%
                  </span>
                  <span
                    className="text-sm font-black pb-1"
                    style={{ color: prob.color }}
                  >
                    {prob.label}
                  </span>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${prob.pct}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: prob.color }}
                  />
                </div>
                <p className="text-[10px] text-white/30 leading-relaxed">
                  {prob.tier === "strong"
                    ? "Excellent match. Your verified skills align strongly with requirements."
                    : prob.tier === "medium"
                      ? "Moderate match. Verify more stack items in your vault to improve."
                      : "Low match. Consider upskilling or verifying relevant assets to improve your percentile."}
                </p>
              </div>
            )}

            {/* Meta */}
            <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-[2rem] p-5 space-y-4">
              {[
                { icon: Globe, label: "Work Mode", val: opp.workMode },
                { icon: MapPin, label: "Location", val: opp.location },
                {
                  icon: DollarSign,
                  label: "Compensation",
                  val: opp.compensation,
                },
                {
                  icon: Target,
                  label: "Experience Level",
                  val: opp.experienceLevel,
                },
                { icon: Building2, label: "Domain", val: opp.domain },
                {
                  icon: Calendar,
                  label: "Closing Date",
                  val: opp.closingDate
                    ? new Date(opp.closingDate).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : undefined,
                },
              ]
                .filter((m) => m.val)
                .map(({ icon: MIcon, label, val }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 pb-3 border-b border-white/[0.04] last:border-0 last:pb-0"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0">
                      <MIcon className="w-3.5 h-3.5 text-white/20" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-0.5">
                        {label}
                      </p>
                      <p className="text-xs font-bold text-white/70">{val}</p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Apply CTA */}
            {opp.applyUrl && (
              <a
                href={opp.applyUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-4 font-black text-[11px] uppercase tracking-widest rounded-2xl text-black transition-all shadow-[0_0_30px_rgba(191,162,100,0.15)]"
                style={{
                  background: `linear-gradient(135deg, #8B7240, #D4AF78)`,
                }}
              >
                Apply Now <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityDetail;
