/**
 * @fileoverview Discotive OS — Admin Command Center
 * @module Admin/Dashboard
 * @description
 * Platform analytics hub for Discotive administrators.
 * All Firestore reads use getCountFromServer (for aggregates) or getDocs with
 * explicit limits to stay well within the free tier budget.
 * No onSnapshot listeners. Data is fetched once on mount with a manual refresh option.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import {
  Users,
  Crown,
  Zap,
  Database,
  ShieldCheck,
  ShieldAlert,
  Activity,
  MessageSquare,
  Ticket,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Clock,
  UserPlus,
  ChevronRight,
  ChevronDown,
  Award,
  FileText,
  Link as LinkIcon,
  Code2,
  Briefcase,
  BookOpen,
  TrendingUp,
  Shield,
  LayoutDashboard,
  Video as VideoIcon,
  PlusCircle,
  X,
  Search,
  Plus,
  Trash2,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "../../lib/cn";
import EfficiencyMeterWidget from "./EfficiencyMeterWidget";

// ============================================================================
// TAXONOMY DICTIONARIES (Synced from Auth)
// ============================================================================

const MACRO_DOMAINS = [
  "Engineering",
  "Design",
  "Filmmaking",
  "Business/Operations",
  "Marketing",
  "Sales",
  "Science",
  "Healthcare/Medical",
  "Arts/Humanities",
  "Legal",
  "Finance/Accounting",
  "Content Creation",
  "Education/Academia",
  "Architecture",
  "Government/Policy",
].sort();

const MICRO_NICHES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Developer",
  "AI/ML Engineer",
  "Data Scientist",
  "Data Analyst",
  "Data Engineer",
  "DevOps Engineer",
  "Cloud Architect",
  "Blockchain Developer",
  "Cybersecurity Analyst",
  "Game Developer",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "3D Modeler",
  "Animator",
  "Director",
  "Producer",
  "Cinematographer",
  "Video Editor",
  "Screenwriter",
  "Actor",
  "Founder / CEO",
  "COO",
  "CTO",
  "Product Manager",
  "Project Manager",
  "Consultant",
  "Venture Capitalist",
  "Investment Banker",
  "Financial Analyst",
  "Accountant",
  "Growth Marketer",
  "Digital Marketer",
  "SEO Specialist",
  "Social Media Manager",
  "B2B Sales",
  "Account Executive",
  "Copywriter",
  "Journalist",
  "Public Relations",
  "Physician",
  "Surgeon",
  "Psychologist",
  "Researcher",
  "Professor",
  "Corporate Lawyer",
].sort();

const RAW_SKILLS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React.js",
  "Next.js",
  "Vue.js",
  "Node.js",
  "Express.js",
  "Django",
  "Flask",
  "Spring Boot",
  "Java",
  "C++",
  "C#",
  "C",
  "Go",
  "Rust",
  "Ruby",
  "Swift",
  "Kotlin",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Firebase",
  "AWS",
  "Google Cloud (GCP)",
  "Microsoft Azure",
  "Docker",
  "Kubernetes",
  "Git",
  "Machine Learning",
  "Deep Learning",
  "TensorFlow",
  "PyTorch",
  "Computer Vision",
  "NLP",
  "Pandas",
  "Tableau",
  "PowerBI",
  "Blockchain",
  "Solidity",
  "Figma",
  "Adobe XD",
  "Adobe Photoshop",
  "Adobe Illustrator",
  "Adobe Premiere Pro",
  "Adobe After Effects",
  "DaVinci Resolve",
  "Blender",
  "Unity",
  "Unreal Engine",
  "SEO",
  "SEM",
  "Google Analytics",
  "Facebook Ads",
  "Copywriting",
  "B2B Sales",
  "Cold Calling",
  "Public Speaking",
  "Financial Modeling",
  "Project Management",
  "Agile",
].sort();

// ============================================================================
// HELPERS & CUSTOM COMPONENTS
// ============================================================================

const getAssetCategoryIcon = (cat) => {
  const map = {
    Certificate: <Award className="w-3.5 h-3.5" />,
    Resume: <FileText className="w-3.5 h-3.5" />,
    Project: <Code2 className="w-3.5 h-3.5" />,
    Publication: <BookOpen className="w-3.5 h-3.5" />,
    Employment: <Briefcase className="w-3.5 h-3.5" />,
    Link: <LinkIcon className="w-3.5 h-3.5" />,
  };
  return map[cat] || <Database className="w-3.5 h-3.5" />;
};

const timeAgo = (isoDate) => {
  if (!isoDate) return "—";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const extractYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i,
  );
  return match ? match[1] : url;
};

const StatCard = ({ label, value, icon: Icon, color, subtext, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="bg-[#0a0a0c] border border-white/[0.05] rounded-[1.5rem] p-6 flex flex-col justify-between min-h-[120px]"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
        {label}
      </span>
      <div
        className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center",
          `bg-current/10`,
        )}
      >
        <Icon className={cn("w-4 h-4", color)} />
      </div>
    </div>
    <div>
      <div
        className={cn("text-4xl font-black font-mono tracking-tight", color)}
      >
        {value}
      </div>
      {subtext && (
        <p className="text-[9px] text-white/25 mt-1 font-medium">{subtext}</p>
      )}
    </div>
  </motion.div>
);

const CustomPieTooltip = ({ active, payload, totalUsers }) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl">
        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">
          {d.name}
        </p>
        <p
          className="text-2xl font-black font-mono"
          style={{ color: d.payload.color }}
        >
          {d.value}
        </p>
        <p className="text-[9px] text-white/30 mt-0.5">
          {totalUsers > 0
            ? `${((d.value / totalUsers) * 100).toFixed(1)}% of all operators`
            : "0% of all operators"}
        </p>
      </div>
    );
  }
  return null;
};

const EmptyState = ({ icon: Icon, message }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center h-full">
    <Icon className="w-7 h-7 text-white/10 mb-3" />
    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
      {message}
    </p>
  </div>
);

// --- Dropdowns for Modals ---
const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  allowCustom = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const wrapperRef = useRef(null);

  useEffect(() => setQuery(value || ""), [value]);
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="flex items-center w-full bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2 text-xs focus-within:border-fuchsia-500/50 transition-colors">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (allowCustom) onChange(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent border-none outline-none text-white placeholder-white/20"
        />
        <ChevronDown className="w-4 h-4 text-white/30" />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-[calc(100%+4px)] left-0 w-full bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar"
          >
            {filtered.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className="px-4 py-2.5 text-xs hover:bg-[#222] cursor-pointer text-[#ccc] hover:text-white truncate"
              >
                {opt}
              </div>
            ))}
            {filtered.length === 0 && allowCustom && query.trim() && (
              <div
                onClick={() => {
                  onChange(query);
                  setIsOpen(false);
                }}
                className="px-4 py-2.5 text-xs hover:bg-[#222] cursor-pointer text-emerald-400 font-bold border-t border-[#333]"
              >
                + Add "{query}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MultiSelect = ({
  options,
  selected,
  onChange,
  placeholder,
  allowCustom = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleOpt = (val) => {
    if (selected.includes(val)) onChange(selected.filter((i) => i !== val));
    else onChange([...selected, val]);
    setQuery("");
  };

  const filtered = options.filter(
    (o) =>
      o.toLowerCase().includes(query.toLowerCase()) && !selected.includes(o),
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className="min-h-[40px] w-full bg-[#111] border border-white/[0.05] rounded-xl px-3 py-1.5 focus-within:border-fuchsia-500/50 transition-colors flex flex-wrap gap-2 items-center cursor-text"
        onClick={() => setIsOpen(true)}
      >
        {selected.map((item) => (
          <span
            key={item}
            className="px-2 py-1 bg-[#222] border border-[#333] rounded-md text-[10px] font-bold text-white flex items-center gap-1"
          >
            {item}{" "}
            <X
              className="w-3 h-3 cursor-pointer hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                toggleOpt(item);
              }}
            />
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-xs text-white placeholder-white/20 py-1"
        />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-[calc(100%+4px)] left-0 w-full bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar"
          >
            {filtered.map((opt) => (
              <div
                key={opt}
                onClick={() => toggleOpt(opt)}
                className="px-4 py-2.5 text-xs hover:bg-[#222] cursor-pointer text-[#ccc] hover:text-white truncate"
              >
                {opt}
              </div>
            ))}
            {filtered.length === 0 && allowCustom && query.trim() && (
              <div
                onClick={() => toggleOpt(query)}
                className="px-4 py-2.5 text-xs hover:bg-[#222] cursor-pointer text-emerald-400 font-bold border-t border-[#333]"
              >
                + Add "{query}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// MAIN ADMIN DASHBOARD
// ============================================================================

const AdminDashboard = () => {
  const navigate = useNavigate();

  // — Data State —
  const [stats, setStats] = useState({
    total: 0,
    pro: 0,
    essential: 0,
    newThisWeek: 0,
  });
  const [pendingVault, setPendingVault] = useState([]);
  const [reportedVault, setReportedVault] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [reports, setReports] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [learnVideos, setLearnVideos] = useState([]);
  const [learnCerts, setLearnCerts] = useState([]);

  // — UI State —
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState(null);

  // — Explorer State —
  const [activeLearnTab, setActiveLearnTab] = useState("youtube");
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);
  const [isAddCertOpen, setIsAddCertOpen] = useState(false);

  // ── DATA FETCHER ──────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setError(null);
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoIso = weekAgo.toISOString();

      const [totalSnap, proSnap] = await Promise.all([
        getCountFromServer(query(collection(db, "users"))),
        getCountFromServer(
          query(collection(db, "users"), where("tier", "==", "PRO")),
        ),
      ]);

      let weeklyNewCount = 0;
      try {
        const weekSnap = await getCountFromServer(
          query(collection(db, "users"), where("createdAt", ">=", weekAgoIso)),
        );
        weeklyNewCount = weekSnap.data().count;
      } catch (_) {}

      const total = totalSnap.data().count;
      const pro = proSnap.data().count;
      const essential = total - pro;
      setStats({ total, pro, essential, newThisWeek: weeklyNewCount });

      const vaultBatch = await getDocs(
        query(collection(db, "users"), limit(50)),
      );
      const pending = [];
      const reported = [];
      vaultBatch.docs.forEach((userDoc) => {
        const data = userDoc.data();
        const vault = data.vault || [];
        vault.forEach((asset) => {
          const enriched = {
            ...asset,
            userId: userDoc.id,
            userName:
              `${data.identity?.firstName || ""} ${data.identity?.lastName || ""}`.trim() ||
              "Unknown",
            userUsername: data.identity?.username || "unknown",
          };
          if (asset.status === "PENDING" || !asset.status)
            pending.push(enriched);
          if (asset.status === "REPORTED") reported.push(enriched);
        });
      });
      setPendingVault(pending);
      setReportedVault(reported);

      try {
        const tkSnap = await getDocs(
          query(
            collection(db, "support_tickets"),
            orderBy("createdAt", "desc"),
            limit(5),
          ),
        );
        setTickets(tkSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_) {
        setTickets([]);
      }

      try {
        const rpSnap = await getDocs(
          query(
            collection(db, "reports"),
            orderBy("createdAt", "desc"),
            limit(5),
          ),
        );
        setReports(rpSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_) {
        setReports([]);
      }

      try {
        const ruSnap = await getDocs(
          query(
            collection(db, "users"),
            orderBy("createdAt", "desc"),
            limit(8),
          ),
        );
        setRecentUsers(ruSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_) {
        const ruSnap = await getDocs(query(collection(db, "users"), limit(8)));
        setRecentUsers(ruSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }

      // Fetch Learn Explorer Data
      try {
        const vidSnap = await getDocs(
          query(collection(db, "discotive_videos"), limit(20)),
        );
        setLearnVideos(vidSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_) {
        setLearnVideos([]);
      }

      try {
        const certSnap = await getDocs(
          query(collection(db, "discotive_certificates"), limit(20)),
        );
        setLearnCerts(certSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_) {
        setLearnCerts([]);
      }

      setLastRefresh(new Date());
    } catch (err) {
      console.error("[AdminDashboard] Fetch failed:", err);
      setError("Failed to load dashboard data. Check Firestore permissions.");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchAllData();
      setLoading(false);
    };
    init();
  }, [fetchAllData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };
  const pieData = [
    { name: "Essential", value: stats.essential, color: "#2a2a2a" },
    { name: "Pro", value: stats.pro, color: "#f59e0b" },
  ];

  const handleDeleteResource = async (collectionName, docId) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this resource?",
      )
    )
      return;

    try {
      await deleteDoc(doc(db, collectionName, docId));
      handleRefresh(); // Sync UI after successful deletion
    } catch (err) {
      console.error(`[AdminDashboard] Deletion failed:`, err);
      setError("Failed to delete resource. Check Firestore permissions.");
    }
  };

  // ============================================================================
  // MODALS COMPONENTS
  // ============================================================================

  const AddVideoModal = () => {
    const [form, setForm] = useState({ title: "", url: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUrlChange = async (e) => {
      const url = e.target.value;
      setForm((p) => ({ ...p, url }));
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        try {
          const res = await fetch(
            `https://noembed.com/embed?dataType=json&url=${url}`,
          );
          const data = await res.json();
          if (data.title) setForm((p) => ({ ...p, title: data.title }));
        } catch (err) {
          console.error("Could not fetch YouTube title");
        }
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const suffix = Math.floor(100000 + Math.random() * 900000);
        await addDoc(collection(db, "discotive_videos"), {
          title: form.title,
          url: form.url,
          type: "video",
          learnId: `discotive_video_${suffix}`,
          createdAt: serverTimestamp(),
        });
        setIsAddVideoOpen(false);
        handleRefresh();
      } catch (err) {
        console.error(err);
      }
      setIsSubmitting(false);
    };

    if (!isAddVideoOpen) return null;
    return createPortal(
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#0a0a0c] border border-white/[0.08] rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-white">Add YouTube Video</h3>
            <button
              onClick={() => setIsAddVideoOpen(false)}
              className="text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                Video Link (YouTube) *
              </label>
              <input
                required
                value={form.url}
                onChange={handleUrlChange}
                placeholder="Paste YouTube URL here..."
                className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                Video Name *
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Extracted automatically..."
                className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50"
              />
            </div>
            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full py-3 bg-sky-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-sky-400 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Deploying..." : "Inject to Video DB"}
            </button>
          </form>
        </motion.div>
      </div>,
      document.body,
    );
  };

  const AddCertificateModal = () => {
    const [form, setForm] = useState({
      title: "",
      link: "",
      provider: "",
      strength: "",
      tags: [],
      topic: [],
      domain: [],
      niche: [],
      target: "",
      cost: "",
      resources: [""],
      description: "",
      notes: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const suffix = Math.floor(100000 + Math.random() * 900000);
        const payload = {
          ...form,
          resources: form.resources.filter((r) => r.trim() !== ""),
          learnId: `discotive_certificate_${suffix}`,
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, "discotive_certificates"), payload);
        setIsAddCertOpen(false);
        handleRefresh();
      } catch (err) {
        console.error(err);
      }
      setIsSubmitting(false);
    };

    if (!isAddCertOpen) return null;
    return createPortal(
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0a0a0c] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-white/[0.05] shrink-0">
            <h3 className="text-sm font-black text-white">
              Add Certificate Blueprint
            </h3>
            <button
              onClick={() => setIsAddCertOpen(false)}
              className="text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <form id="certForm" onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                    Certificate Name *
                  </label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                    Link *
                  </label>
                  <input
                    required
                    type="url"
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                    className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                    Provider Institution *
                  </label>
                  <input
                    required
                    value={form.provider}
                    onChange={(e) =>
                      setForm({ ...form, provider: e.target.value })
                    }
                    className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                    Strength *
                  </label>
                  <select
                    required
                    value={form.strength}
                    onChange={(e) =>
                      setForm({ ...form, strength: e.target.value })
                    }
                    className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="" disabled>
                      Select strength
                    </option>
                    <option value="Weak">Weak</option>
                    <option value="Medium">Medium</option>
                    <option value="Strong">Strong</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                    Tags
                  </label>
                  <MultiSelect
                    options={RAW_SKILLS}
                    selected={form.tags}
                    onChange={(v) => setForm({ ...form, tags: v })}
                    placeholder="Add tags..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                    Topics
                  </label>
                  <MultiSelect
                    options={RAW_SKILLS}
                    selected={form.topic}
                    onChange={(v) => setForm({ ...form, topic: v })}
                    placeholder="Add topics..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                    Domain
                  </label>
                  <MultiSelect
                    options={MACRO_DOMAINS}
                    selected={form.domain}
                    onChange={(v) => setForm({ ...form, domain: v })}
                    placeholder="Add domains..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                    Niche
                  </label>
                  <MultiSelect
                    options={MICRO_NICHES}
                    selected={form.niche}
                    onChange={(v) => setForm({ ...form, niche: v })}
                    placeholder="Add niches..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                    Target Audience
                  </label>
                  <select
                    value={form.target}
                    onChange={(e) =>
                      setForm({ ...form, target: e.target.value })
                    }
                    className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="">Select target...</option>
                    <option value="Students">Students</option>
                    <option value="Professionals">Professionals</option>
                    <option value="All">All</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                    Cost Model
                  </label>
                  <select
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="">Select cost...</option>
                    <option value="Free">Free</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center justify-between mb-1.5">
                  Resources
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        resources: [...p.resources, ""],
                      }))
                    }
                    className="text-amber-500 hover:text-amber-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </label>
                <div className="space-y-2">
                  {form.resources.map((res, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="url"
                        value={res}
                        onChange={(e) => {
                          const newRes = [...form.resources];
                          newRes[i] = e.target.value;
                          setForm({ ...form, resources: newRes });
                        }}
                        placeholder="https://"
                        className="flex-1 bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                      />
                      {form.resources.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newRes = form.resources.filter(
                              (_, idx) => idx !== i,
                            );
                            setForm({ ...form, resources: newRes });
                          }}
                          className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Description
                  </label>
                  <span
                    className={cn(
                      "text-[9px] font-mono",
                      form.description.length > 950
                        ? "text-amber-500"
                        : "text-white/20",
                    )}
                  >
                    {form.description.length}/1000
                  </span>
                </div>
                <textarea
                  maxLength={1000}
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Notes
                  </label>
                  <span
                    className={cn(
                      "text-[9px] font-mono",
                      form.notes.length > 180
                        ? "text-amber-500"
                        : "text-white/20",
                    )}
                  >
                    {form.notes.length}/200
                  </span>
                </div>
                <textarea
                  maxLength={200}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            </form>
          </div>
          <div className="p-6 border-t border-white/[0.05] shrink-0">
            <button
              form="certForm"
              disabled={isSubmitting}
              type="submit"
              className="w-full py-3 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Deploying..." : "Inject to Certificate DB"}
            </button>
          </div>
        </motion.div>
      </div>,
      document.body,
    );
  };

  // ── SKELETON ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
                className="w-1 h-5 bg-amber-500 rounded-full"
              />
            ))}
          </div>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
            Syncing platform telemetry...
          </p>
        </div>
      </div>
    );
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#000000] text-white pb-32 font-sans selection:bg-amber-500/30">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none z-0" />

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 relative z-10">
        {/* ── HEADER ── */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="px-3 py-1.5 rounded-full bg-[#111] border border-amber-500/20 text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />{" "}
                Sector Omega — Live
              </div>
              <div className="px-3 py-1.5 rounded-full bg-[#111] border border-[#222] text-[9px] font-bold text-white/30 uppercase tracking-widest">
                {auth.currentUser?.email}
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              Admin Command Center
            </h1>
            <p className="text-white/30 text-sm mt-1 font-medium">
              {lastRefresh
                ? `Last synced ${timeAgo(lastRefresh.toISOString())}`
                : "Syncing..."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0c] border border-white/[0.05] rounded-xl text-xs font-bold text-white/60 hover:text-white transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> User Dashboard
            </Link>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0a0a0c] border border-white/[0.05] rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all disabled:opacity-40"
            >
              <RefreshCw
                className={cn("w-4 h-4", refreshing && "animate-spin")}
              />{" "}
              {refreshing ? "Syncing..." : "Refresh"}
            </button>
          </div>
        </motion.header>
        {/* ── ERROR BANNER ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-red-500/8 border border-red-500/20 rounded-2xl flex items-center gap-3"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm font-bold text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
        {/* ── STATS ROW ── */}
        {refreshing ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[120px] bg-white/[0.02] rounded-[1.5rem]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Operators"
              value={stats.total}
              icon={Users}
              color="text-white"
              subtext="All registered users"
              delay={0.05}
            />
            <StatCard
              label="Pro Tier"
              value={stats.pro}
              icon={Crown}
              color="text-amber-500"
              subtext={`${stats.total > 0 ? ((stats.pro / stats.total) * 100).toFixed(1) : 0}% of all users`}
              delay={0.1}
            />
            <StatCard
              label="Essential Tier"
              value={stats.essential}
              icon={Zap}
              color="text-sky-400"
              subtext={`${stats.total > 0 ? ((stats.essential / stats.total) * 100).toFixed(1) : 0}% of all users`}
              delay={0.15}
            />
            <StatCard
              label="New This Week"
              value={stats.newThisWeek}
              icon={UserPlus}
              color="text-emerald-400"
              subtext="User growth (7 days)"
              delay={0.2}
            />
          </div>
        )}
        {/* ── MAIN GRID: PIE CHART + ACTIVITY FEED ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="col-span-1 md:col-span-5 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 flex flex-col"
          >
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Users className="w-4 h-4 text-amber-500" /> User Distribution
            </h2>
            {stats.total === 0 ? (
              <EmptyState icon={Users} message="No users registered yet" />
            ) : (
              <>
                <div className="relative flex-1 min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={115}
                        dataKey="value"
                        strokeWidth={0}
                        paddingAngle={3}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={<CustomPieTooltip totalUsers={stats.total} />}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-5xl font-black text-white font-mono leading-none">
                        {stats.total}
                      </div>
                      <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1.5">
                        Total Operators
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <div>
                      <p className="text-xs font-black text-white">
                        {stats.pro}
                      </p>
                      <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                        Pro
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
                    <div>
                      <p className="text-xs font-black text-white">
                        {stats.essential}
                      </p>
                      <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                        Essential
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <div>
                      <p className="text-xs font-black text-emerald-400">
                        +{stats.newThisWeek}
                      </p>
                      <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                        This Week
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-1 md:col-span-7 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 flex flex-col"
          >
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-sky-400" /> Recent Operator
              Registrations
            </h2>
            {recentUsers.length === 0 ? (
              <EmptyState icon={Users} message="No recent signups" />
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {recentUsers.map((user, i) => {
                  const name =
                    `${user.identity?.firstName || ""} ${user.identity?.lastName || ""}`.trim() ||
                    user.identity?.username ||
                    "Unknown";
                  const username =
                    user.identity?.username || user.id.slice(0, 8);
                  const tier = user.tier || "ESSENTIAL";
                  const domain =
                    user.identity?.domain ||
                    user.vision?.passion ||
                    "Uncategorized";
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                      className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.03] rounded-xl hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#111] border border-white/[0.06] flex items-center justify-center text-sm font-black text-white/60 shrink-0">
                        {name.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">
                            {name}
                          </p>
                          {tier === "PRO" && (
                            <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-white/30 font-mono truncate">
                          @{username} · {domain}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                          {timeAgo(user.createdAt)}
                        </p>
                        <p
                          className={cn(
                            "text-[8px] font-black uppercase tracking-widest mt-0.5",
                            tier === "PRO" ? "text-amber-500" : "text-white/20",
                          )}
                        >
                          {tier}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
        {/* ── VAULT VERIFICATION WIDGET ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 mb-4"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" /> Vault Operations
              Center
            </h2>
            <Link
              to="/app/admin/users/verifyvault"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500/15 transition-all"
            >
              Open Full Vault Manager <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-black text-white">
                    Pending Verification
                  </span>
                </div>
                <span className="text-3xl font-black text-amber-500 font-mono">
                  {pendingVault.length}
                  {pendingVault.length >= 50 && (
                    <span className="text-[10px] text-amber-500/50 ml-1">
                      +
                    </span>
                  )}
                </span>
              </div>
              {pendingVault.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  message="All assets verified — queue clear"
                />
              ) : (
                <div className="space-y-2">
                  {pendingVault.slice(0, 4).map((asset) => (
                    <div
                      key={`${asset.userId}-${asset.id}`}
                      className="flex items-center gap-2.5 p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                        {getAssetCategoryIcon(asset.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">
                          {asset.title || "Untitled Asset"}
                        </p>
                        <p className="text-[9px] text-white/30 font-mono truncate">
                          @{asset.userUsername} · {asset.category || "Unknown"}
                        </p>
                      </div>
                      <p className="text-[9px] text-white/20 shrink-0">
                        {timeAgo(asset.uploadedAt)}
                      </p>
                    </div>
                  ))}
                  {pendingVault.length > 4 && (
                    <Link
                      to="/app/admin/users/verifyvault"
                      className="block text-center text-[9px] font-black text-amber-500/60 hover:text-amber-500 transition-colors pt-1 uppercase tracking-widest"
                    >
                      +{pendingVault.length - 4} more pending →
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="bg-red-500/[0.03] border border-red-500/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-black text-white">
                    Reported Assets
                  </span>
                </div>
                <span className="text-3xl font-black text-red-400 font-mono">
                  {reportedVault.length}
                  {reportedVault.length >= 50 && (
                    <span className="text-[10px] text-red-400/50 ml-1">+</span>
                  )}
                </span>
              </div>
              {reportedVault.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  message="No reported assets — platform clean"
                />
              ) : (
                <div className="space-y-2">
                  {reportedVault.slice(0, 4).map((asset) => (
                    <div
                      key={`${asset.userId}-${asset.id}`}
                      className="flex items-center gap-2.5 p-2.5 bg-white/[0.02] border border-red-500/10 rounded-xl"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                        {getAssetCategoryIcon(asset.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">
                          {asset.title || "Untitled Asset"}
                        </p>
                        <p className="text-[9px] text-white/30 font-mono truncate">
                          @{asset.userUsername} · {asset.category || "Unknown"}
                        </p>
                      </div>
                      <div className="shrink-0 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[8px] font-black text-red-400 uppercase">
                        Reported
                      </div>
                    </div>
                  ))}
                  {reportedVault.length > 4 && (
                    <Link
                      to="/app/admin/users/verifyvault?filter=REPORTED"
                      className="block text-center text-[9px] font-black text-red-400/60 hover:text-red-400 transition-colors pt-1 uppercase tracking-widest"
                    >
                      +{reportedVault.length - 4} more reported →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
        {/* ── HORIZONTAL LEARN ENGINE EXPLORER WIDGET ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] flex flex-col mb-6 overflow-hidden h-[500px]"
        >
          {/* Widget Header */}
          <div className="h-16 flex items-center px-6 justify-between border-b border-white/[0.05] bg-[#0a0a0c]/50 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#111] border border-white/[0.05] flex items-center justify-center">
                <Database className="w-4 h-4 text-fuchsia-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">
                  Learn Engine DB
                </h3>
                <p className="text-[9px] font-bold text-fuchsia-400 uppercase tracking-widest">
                  Manage Global Resources
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                activeLearnTab === "youtube"
                  ? setIsAddVideoOpen(true)
                  : setIsAddCertOpen(true)
              }
              className="flex items-center gap-2 px-4 py-2 bg-fuchsia-500 hover:bg-fuchsia-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add {activeLearnTab === "youtube" ? "Video" : "Certificate"}
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 bg-[#0a0a0c] border-r border-white/[0.05] p-4 flex flex-col gap-4 overflow-y-auto">
              <div>
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest px-2 mb-2">
                  Sources
                </p>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveLearnTab("youtube")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                      activeLearnTab === "youtube"
                        ? "bg-[#111] border border-white/[0.08] text-white shadow-lg"
                        : "text-white/40 hover:bg-white/[0.02] hover:text-white",
                    )}
                  >
                    <VideoIcon
                      className={cn(
                        "w-4 h-4",
                        activeLearnTab === "youtube"
                          ? "text-sky-400"
                          : "text-white/40",
                      )}
                    />
                    YouTube DB
                  </button>
                  <button
                    onClick={() => setActiveLearnTab("certificates")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                      activeLearnTab === "certificates"
                        ? "bg-[#111] border border-white/[0.08] text-white shadow-lg"
                        : "text-white/40 hover:bg-white/[0.02] hover:text-white",
                    )}
                  >
                    <Award
                      className={cn(
                        "w-4 h-4",
                        activeLearnTab === "certificates"
                          ? "text-amber-400"
                          : "text-white/40",
                      )}
                    />
                    Certificates DB
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-[#050505] p-6 overflow-y-auto custom-scrollbar">
              {activeLearnTab === "youtube" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {learnVideos.length === 0 ? (
                    <EmptyState
                      icon={VideoIcon}
                      message="No videos deployed yet"
                    />
                  ) : (
                    learnVideos.map((v) => (
                      <div
                        key={v.id}
                        className="flex flex-col gap-3 p-3 rounded-2xl bg-[#0a0a0c] border border-white/[0.05] hover:border-white/20 transition-all relative group"
                      >
                        <button
                          onClick={() =>
                            handleDeleteResource("discotive_videos", v.id)
                          }
                          className="absolute top-5 right-5 z-20 p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl backdrop-blur-md"
                          title="Delete Video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-full aspect-video bg-[#000] rounded-xl overflow-hidden relative border border-white/[0.05]">
                          <img
                            src={
                              v.thumbnailUrl ||
                              `https://img.youtube.com/vi/${extractYouTubeId(v.url || v.youtubeId)}/maxresdefault.jpg`
                            }
                            className="w-full h-full object-cover"
                            alt={v.title}
                          />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white line-clamp-2 leading-tight">
                            {v.title}
                          </span>
                          <span className="text-[9px] text-sky-400 font-mono mt-1 block truncate">
                            ID: {v.learnId}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeLearnTab === "certificates" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {learnCerts.length === 0 ? (
                    <EmptyState
                      icon={Award}
                      message="No certificates deployed yet"
                    />
                  ) : (
                    learnCerts.map((cert) => (
                      <div
                        key={cert.id}
                        className="flex flex-col gap-3 p-4 rounded-2xl bg-[#0a0a0c] border border-white/[0.05] hover:border-white/20 transition-all relative group"
                      >
                        <button
                          onClick={() =>
                            handleDeleteResource(
                              "discotive_certificates",
                              cert.id,
                            )
                          }
                          className="absolute top-4 right-4 z-10 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete Certificate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-start gap-3 pr-8">
                          <div className="w-10 h-10 rounded-xl bg-[#111] border border-white/[0.05] flex items-center justify-center shrink-0">
                            <Award className="w-5 h-5 text-amber-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4
                              className="text-xs font-bold text-white truncate"
                              title={cert.title}
                            >
                              {cert.title}
                            </h4>
                            <p className="text-[10px] text-white/50 truncate mt-0.5">
                              {cert.provider}
                            </p>
                            <div className="mt-1.5 flex items-center gap-1 text-[8px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded w-fit border border-amber-500/20">
                              ID: {cert.learnId}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
        {/* ── BOTTOM ROW ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EfficiencyMeterWidget />

          {/* TICKETS CARD */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Ticket className="w-4 h-4 text-sky-400" /> Support Tickets
              </h2>
              {/* ← ADD THIS REDIRECT BUTTON */}
              <Link
                to="/app/admin/tickets"
                className="flex items-center gap-1.5 text-[9px] font-black text-sky-400/60 hover:text-sky-400 uppercase tracking-widest transition-colors"
              >
                Manage All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {/* ← ADD SKELETON WHEN REFRESHING */}
            {refreshing ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/[0.02] rounded-xl" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <EmptyState icon={Ticket} message="No open support tickets" />
            ) : (
              <div className="space-y-2 flex-1">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 bg-white/[0.02] border border-white/[0.03] rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-bold text-white truncate">
                        {ticket.subject || "No subject"}
                      </p>
                      <span
                        className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ml-2 shrink-0",
                          ticket.status === "open"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-white/5 text-white/30",
                        )}
                      >
                        {ticket.status || "open"}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">
                      {ticket.message || "No message"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[8px] text-white/20 uppercase tracking-widest">
                        {ticket.category || "—"}
                      </span>
                      <span className="text-[8px] text-white/20">
                        {timeAgo(ticket.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* REPORTS CARD — same pattern */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" /> User
                Reports
              </h2>
              {/* ← ADD THIS REDIRECT BUTTON */}
              <Link
                to="/app/admin/reports"
                className="flex items-center gap-1.5 text-[9px] font-black text-orange-400/60 hover:text-orange-400 uppercase tracking-widest transition-colors"
              >
                Manage All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {refreshing ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/[0.02] rounded-xl" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <EmptyState icon={Shield} message="No user reports on file" />
            ) : (
              <div className="space-y-2 flex-1">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3 bg-white/[0.02] border border-white/[0.03] rounded-xl"
                  >
                    <p className="text-[11px] font-bold text-white truncate">
                      {report.reason || "No reason"}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">
                      {report.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[8px] font-bold text-orange-400/60 uppercase tracking-widest">
                        {report.targetType || "user"}
                      </span>
                      <span className="text-[8px] text-white/20">
                        {timeAgo(report.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Render Modals */}
      <AddVideoModal />
      <AddCertificateModal />
    </div>
  );
};

export default AdminDashboard;
