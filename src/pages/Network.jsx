import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  collection,
  getDocs,
  onSnapshot,
  doc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { awardAllianceAction } from "../lib/scoreEngine";
import {
  Search,
  Filter,
  ChevronDown,
  X,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Activity,
  ShieldCheck,
  Target,
  Users,
  Swords,
  GraduationCap,
  Globe,
  Sparkles,
  Eye,
  UserPlus,
  Clock,
  CheckCircle2,
  UserMinus,
  Crown,
  Zap,
  Inbox,
  Send,
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

// ============================================================================
// 1. CONFIGURATIONS & TAXONOMY
// ============================================================================
const DOMAINS = {
  "Engineering & Tech": [
    "Software Engineering",
    "AI/ML Engineer",
    "Web Development",
    "Protocol Dev",
    "DevOps",
  ],
  "Business & Strategy": [
    "Founder",
    "Product Management",
    "Growth & Marketing",
    "Operations",
  ],
  "Design & Art": [
    "UI/UX Design",
    "Product Design",
    "3D Art",
    "Graphic Design",
  ],
  "Filmmaking & Media": [
    "Director",
    "Cinematic Colorist",
    "Editor",
    "Content Creator",
  ],
};

const SCOPES = ["Global Arena", "Academic Institutions"];
const TABS = ["The Watchlist", "Global Arena", "My Alliance", "Alumni"];

// ============================================================================
// 2. THE COMPARE TERMINAL MODAL
// ============================================================================
const CompareTerminal = ({ isOpen, onClose, targetUser, currentUser }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[500] flex justify-center items-end sm:items-center p-0 sm:p-6 pl-0 md:pl-64">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl h-[85vh] sm:h-[75vh] bg-[#0a0a0a] border border-[#222] sm:rounded-[2rem] rounded-t-[2rem] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        <div className="flex justify-between items-center p-5 border-b border-[#222] bg-[#111] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-white">
                Discotive AI
              </h2>
              <p className="text-[10px] text-amber-500 font-medium">Online</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-[#222] rounded-full text-[#888] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-[#050505] flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className="self-end max-w-[80%] bg-[#222] border border-[#333] text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-md"
          >
            <p className="text-sm font-medium leading-relaxed">
              Compare my profile with{" "}
              <span className="font-bold text-amber-500">
                @{targetUser?._username}
              </span>
            </p>
            <div className="text-[9px] text-[#888] text-right mt-1 font-mono">
              Just now
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="self-start max-w-[80%] bg-[#111] border border-[#222] px-5 py-4 rounded-2xl rounded-tl-sm shadow-md flex items-center gap-1.5"
          >
            <div
              className="w-2 h-2 bg-[#555] rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-[#555] rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-[#555] rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </motion.div>
        </div>
        <div className="p-4 bg-[#111] border-t border-[#222] shrink-0">
          <div className="w-full bg-[#050505] border border-[#333] rounded-full px-5 py-3 text-sm text-[#444] font-medium flex justify-between items-center">
            <span>Awaiting engine response...</span>
            <Activity className="w-4 h-4 text-[#444] animate-pulse" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// 3. 3D FLIPPING OPERATOR CARD (Tap-to-Flip for Mobile)
// ============================================================================
const OperatorCard = ({ user, currentUser, isWatchlist, handlers, rank }) => {
  const [isFlipped, setIsFlipped] = useState(false); // Controls the flip state
  const isMe = user.id === currentUser?.id;
  const isCompetitor = !isMe && user._domain === currentUser?._domain;

  // DB States
  const isWatched = currentUser?.watchlist?.includes(user.id);
  const isAllied = currentUser?.allies?.includes(user.id);
  const reqSent = currentUser?.outboundRequests?.includes(user.id);
  const reqReceived = currentUser?.inboundRequests?.includes(user.id);

  // Top 3 Oscar Gradient Logic
  const isTop3 = rank <= 3 && rank > 0;
  const cardGradient = isTop3
    ? "bg-gradient-to-t from-[#221705] to-[#1a1205] border-amber-900/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
    : "bg-[#111] border-[#222] hover:border-[#444]";

  const avatarGlow = isTop3
    ? "drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] border-amber-500/50"
    : "border-[#333]";

  return (
    // Reduced height for mobile (280px), cursor pointer, click handler toggles state
    <div
      className="group w-full h-[280px] md:h-[360px] perspective-[1500px] cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      {/* Flipping Container (Now driven by isFlipped state instead of group-hover) */}
      <div
        className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
        style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* --- FRONT SIDE --- */}
        <div
          className={cn(
            "absolute inset-0 [backface-visibility:hidden] rounded-[2rem] border p-5 md:p-6 flex flex-col items-center text-center",
            cardGradient,
          )}
        >
          <div className="w-full flex justify-between items-start mb-3 md:mb-4">
            <div className="text-left">
              <span className="text-[8px] md:text-[9px] text-[#666] font-bold uppercase tracking-widest block">
                Rank
              </span>
              <span
                className={cn(
                  "font-extrabold text-lg md:text-xl",
                  isTop3 ? "text-amber-500" : "text-white",
                )}
              >
                #{rank}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] md:text-[9px] text-[#666] font-bold uppercase tracking-widest block">
                Score
              </span>
              <span className="font-extrabold text-lg md:text-xl text-white">
                {user._score}
              </span>
            </div>
          </div>

          <div
            className={cn(
              "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xl md:text-2xl font-extrabold text-white mb-3 md:mb-4 bg-[#1a1a1a] border-2",
              avatarGlow,
            )}
          >
            {user._initials}
          </div>

          <h3 className="font-extrabold text-white text-base md:text-lg tracking-tight w-full truncate px-2">
            {user._firstName} {user._lastName}
          </h3>
          <p className="text-[10px] md:text-xs font-mono text-[#888] truncate mb-2 md:mb-3">
            @{user._username}
          </p>

          <div className="mt-auto w-full">
            <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-widest truncate">
              {user._domain}
            </p>
            <p className="text-xs md:text-sm font-bold text-[#ccc] truncate">
              {user._niche}
            </p>
          </div>

          {isTop3 && (
            <Crown className="absolute bottom-4 right-4 w-5 h-5 md:w-6 md:h-6 text-amber-500/20" />
          )}
        </div>

        {/* --- BACK SIDE --- */}
        <div
          className={cn(
            "absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-[2rem] border p-5 md:p-6 flex flex-col",
            cardGradient,
          )}
        >
          <div className="flex-1 overflow-hidden">
            <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1.5 md:mb-2">
              Parallel Goal
            </p>
            <p className="text-xs md:text-sm font-bold text-white leading-relaxed line-clamp-3 md:line-clamp-4 mb-3 md:mb-4">
              {user._goal ||
                "Establishing baseline metrics. No parallel goal defined."}
            </p>

            <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1.5 md:mb-2">
              Capabilities
            </p>
            <div className="flex flex-wrap gap-1.5">
              {user._skills.slice(0, 4).map((skill, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-[#050505] text-[#ccc] text-[8px] md:text-[9px] font-bold uppercase tracking-wider rounded border border-[#222]"
                >
                  {skill}
                </span>
              ))}
              {user._skills.length === 0 && (
                <span className="text-[9px] md:text-[10px] text-[#555] font-mono">
                  [ UNKNOWN ]
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons (Added e.stopPropagation() to prevent flipping when clicking actions) */}
          <div className="mt-auto grid grid-cols-4 gap-2 pt-3 md:pt-4 border-t border-white/5">
            <Link
              to={`/user/${user._username}`}
              onClick={(e) => e.stopPropagation()}
              className="col-span-4 text-center py-1.5 md:py-2 bg-white text-black font-extrabold text-[10px] md:text-xs rounded-xl hover:bg-[#ccc] transition-colors uppercase tracking-widest mb-1"
            >
              View Profile
            </Link>

            {!isMe && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlers.compare(user);
                  }}
                  className="col-span-2 py-1.5 md:py-2 flex justify-center items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all text-[9px] md:text-[10px] font-bold uppercase tracking-widest"
                  title="Compare Metrics"
                >
                  <Sparkles className="w-3.5 h-3.5" /> VS
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlers.watchlist(user.id, isWatched);
                  }}
                  className={cn(
                    "col-span-1 py-1.5 md:py-2 flex justify-center items-center rounded-xl border transition-all",
                    isWatched
                      ? "bg-red-500/10 border-red-500/30 text-red-500"
                      : "bg-[#050505] border-[#333] text-[#888] hover:text-red-500 hover:border-red-500",
                  )}
                  title={
                    isWatched ? "Remove from Watchlist" : "Add to Watchlist"
                  }
                >
                  <Target className="w-4 h-4" />
                </button>

                {!reqReceived ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlers.alliance(user.id, isAllied, reqSent);
                    }}
                    disabled={reqSent || isAllied}
                    className={cn(
                      "col-span-1 py-1.5 md:py-2 flex justify-center items-center rounded-xl border transition-all",
                      isAllied
                        ? "bg-green-500/10 border-green-500/30 text-green-500 opacity-50"
                        : reqSent
                          ? "bg-green-500/10 border-green-500/30 text-green-500 opacity-50"
                          : "bg-[#050505] border-[#333] text-[#888] hover:text-green-500 hover:border-green-500",
                    )}
                    title={
                      isAllied
                        ? "Allied"
                        : reqSent
                          ? "Request Sent"
                          : "Send Alliance Request"
                    }
                  >
                    {isAllied ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : reqSent ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <div className="col-span-1 flex relative group/req cursor-pointer bg-green-500/10 border border-green-500/30 text-green-500 rounded-xl items-center justify-center">
                    <span className="text-[7px] md:text-[8px] font-extrabold uppercase">
                      Accept?
                    </span>
                    <div className="absolute bottom-full mb-2 hidden group-hover/req:flex gap-1 p-1 bg-black border border-[#333] rounded-lg shadow-xl z-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlers.accept(user.id);
                        }}
                        className="p-1.5 bg-green-500/20 text-green-500 rounded hover:bg-green-500/40"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlers.reject(user.id);
                        }}
                        className="p-1.5 bg-red-500/20 text-red-500 rounded hover:bg-red-500/40"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. MAIN NETWORK COMPONENT
// ============================================================================
const Network = () => {
  const { userData, loading: userLoading } = useUserData();

  // -- Real Data State --
  const [dbUsers, setDbUsers] = useState([]);
  const [isFetching, setIsFetching] = useState(true);

  // -- Engine State --
  const [activeTab, setActiveTab] = useState("The Watchlist");
  const [showRequests, setShowRequests] = useState(false); // Toggle for Alliance Requests view
  const [requestTab, setRequestTab] = useState("sent"); // Sub-tab for requests
  const [searchQuery, setSearchQuery] = useState("");

  // -- UI State --
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const [limit, setLimit] = useState(12);
  const [page, setPage] = useState(1);

  // -- Compare State & Quota Engine --
  const [compareTarget, setCompareTarget] = useState(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [queriesUsed, setQueriesUsed] = useState(0);
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  // -- Click-Outside Refs --
  const filterMenuRef = useRef(null);
  const pageDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target))
        setActiveDropdown(null);
      if (
        pageDropdownRef.current &&
        !pageDropdownRef.current.contains(e.target)
      )
        setIsPageDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -- Master Filter State --
  const [filters, setFilters] = useState({
    scope: "Global Arena",
    domain: "All Domains",
  });

  const isFiltered = useMemo(() => {
    return (
      filters.scope !== "Global Arena" ||
      filters.domain !== "All Domains" ||
      searchQuery !== ""
    );
  }, [filters, searchQuery]);

  // Reset Sub-Views when changing tabs
  useEffect(() => {
    setShowRequests(false);
    setPage(1);
  }, [activeTab]);

  // --- COMPARE QUOTA LOGIC ---
  const subscriptionTier = userData?.subscription?.tier || "free";
  const maxQueries = subscriptionTier === "pro" ? 3 : 1;

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const stored = localStorage.getItem(`discotive_compare_${today}`);
    if (stored) {
      setQueriesUsed(parseInt(stored, 10));
    } else {
      setQueriesUsed(0);
    }
  }, []);

  const handleOpenCompare = (user) => {
    if (queriesUsed >= maxQueries) {
      setIsProModalOpen(true);
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const newCount = queriesUsed + 1;
    setQueriesUsed(newCount);
    localStorage.setItem(`discotive_compare_${today}`, newCount.toString());

    setCompareTarget(user);
    setIsCompareOpen(true);
  };

  // --- FETCH REAL DATA (100% LIVE REAL-TIME ENGINE) ---
  useEffect(() => {
    if (!userData?.identity?.email) return;

    // onSnapshot creates a live WebSocket connection to the DB
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (querySnapshot) => {
        const rawUsers = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          rawUsers.push({
            id: doc.id,
            ...data,
            _firstName: data.identity?.firstName || "Unknown",
            _lastName: data.identity?.lastName || "",
            _email: data.identity?.email || "",
            _username:
              data.identity?.username ||
              data.identity?.email?.split("@")[0] ||
              "user",
            _initials:
              `${data.identity?.firstName?.charAt(0) || ""}${data.identity?.lastName?.charAt(0) || ""}`.toUpperCase(),
            _domain: data.vision?.passion || "Uncategorized",
            _niche: data.vision?.niche || "Unspecified",
            _location: data.footprint?.location || null,
            _institution: data.baseline?.institution || null,
            _score: data.discotiveScore || 0,
            _level: Math.min(
              Math.floor((data.discotiveScore || 0) / 1000) + 1,
              10,
            ),
            _goal: data.vision?.goal3Months || "",
            _skills:
              data.skills?.alignedSkills?.length > 0
                ? data.skills.alignedSkills
                : data.skills?.rawSkills || [],
          });
        });

        // Sort descending by score globally
        const sorted = rawUsers.sort((a, b) => b._score - a._score);
        setDbUsers(sorted);

        // Smart Tab Routing: If Watchlist is empty on initial load, default to Global Arena
        const me = sorted.find((u) => u._email === userData?.identity?.email);
        if (me && (!me.watchlist || me.watchlist.length === 0)) {
          setActiveTab((prev) =>
            prev === "The Watchlist" ? "Global Arena" : prev,
          );
        }

        setIsFetching(false);
      },
      (error) => {
        console.error("Network Sync Failed:", error);
        setIsFetching(false);
      },
    );

    // Clean up the live listener when the component unmounts
    return () => unsubscribe();
  }, [userData]);

  // Sync Current User Object locally for instant UI reactions
  const [currentUserObj, setCurrentUserObj] = useState(null);
  useEffect(() => {
    const me = dbUsers.find((u) => u._email === userData?.identity?.email);
    if (me)
      setCurrentUserObj({
        ...me,
        watchlist: me.watchlist || [],
        allies: me.allies || [],
        outboundRequests: me.outboundRequests || [],
        inboundRequests: me.inboundRequests || [],
      });
  }, [dbUsers, userData]);

  // ============================================================================
  // 5. FIREBASE MUTATION HANDLERS (100% REAL)
  // ============================================================================
  const updateLocalUser = (updates) =>
    setCurrentUserObj((prev) => ({ ...prev, ...updates }));

  const handleWatchlist = async (targetId, isWatched) => {
    if (!currentUserObj) return;
    const myId = currentUserObj.id;
    const myRef = doc(db, "users", myId);
    try {
      // Optimistic UI Update
      updateLocalUser({
        watchlist: isWatched
          ? currentUserObj.watchlist.filter((id) => id !== targetId)
          : [...currentUserObj.watchlist, targetId],
      });
      // Database Write
      await writeBatch(db)
        .update(myRef, {
          watchlist: isWatched ? arrayRemove(targetId) : arrayUnion(targetId),
        })
        .commit();
    } catch (err) {
      console.error("Watchlist failed:", err);
      // Revert on fail
      updateLocalUser({ watchlist: currentUserObj.watchlist });
    }
  };

  const handleSendAlliance = async (targetId, isAllied, reqSent) => {
    if (isAllied || reqSent || !currentUserObj) return;
    const myId = currentUserObj.id;
    const batch = writeBatch(db);
    batch.update(doc(db, "users", myId), {
      outboundRequests: arrayUnion(targetId),
    });
    batch.update(doc(db, "users", targetId), {
      inboundRequests: arrayUnion(myId),
    });

    try {
      // Correct UI Update using setDbUsers
      setDbUsers((prev) =>
        prev.map((user) => {
          if (user.id === myId)
            return {
              ...user,
              outboundRequests: [...(user.outboundRequests || []), targetId],
            };
          if (user.id === targetId)
            return {
              ...user,
              inboundRequests: [...(user.inboundRequests || []), myId],
            };
          return user;
        }),
      );

      await batch.commit();

      // SCORE ENGINE: The person receiving the request gets +1
      awardAllianceAction(targetId, "received_any");
    } catch (err) {
      console.error("Alliance request failed:", err);
    }
  };

  const handleAcceptAlliance = async (requesterId) => {
    if (!currentUserObj) return;
    const myId = currentUserObj.id;
    const batch = writeBatch(db);
    batch.update(doc(db, "users", myId), {
      allies: arrayUnion(requesterId),
      inboundRequests: arrayRemove(requesterId),
    });
    batch.update(doc(db, "users", requesterId), {
      allies: arrayUnion(myId),
      outboundRequests: arrayRemove(myId),
    });

    try {
      // Correct UI Update using setDbUsers
      setDbUsers((prev) =>
        prev.map((user) => {
          if (user.id === myId)
            return {
              ...user,
              allies: [...(user.allies || []), requesterId],
              inboundRequests: (user.inboundRequests || []).filter(
                (id) => id !== requesterId,
              ),
            };
          if (user.id === requesterId)
            return {
              ...user,
              allies: [...(user.allies || []), myId],
              outboundRequests: (user.outboundRequests || []).filter(
                (id) => id !== myId,
              ),
            };
          return user;
        }),
      );

      await batch.commit();

      // SCORE ENGINE: The person who originally sent the request gets +2 for success
      awardAllianceAction(requesterId, "sent_accepted");
    } catch (err) {
      console.error("Accept failed:", err);
    }
  };

  const handleRejectAlliance = async (requesterId) => {
    if (!currentUserObj) return;
    const myId = currentUserObj.id;
    const batch = writeBatch(db);
    batch.update(doc(db, "users", myId), {
      inboundRequests: arrayRemove(requesterId),
    });
    batch.update(doc(db, "users", requesterId), {
      outboundRequests: arrayRemove(myId),
    });

    try {
      // Correct UI Update using setDbUsers
      setDbUsers((prev) =>
        prev.map((user) => {
          if (user.id === myId)
            return {
              ...user,
              inboundRequests: (user.inboundRequests || []).filter(
                (id) => id !== requesterId,
              ),
            };
          if (user.id === requesterId)
            return {
              ...user,
              outboundRequests: (user.outboundRequests || []).filter(
                (id) => id !== myId,
              ),
            };
          return user;
        }),
      );

      await batch.commit();

      // SCORE ENGINE: The person who sent the request gets penalized -1 for rejection
      awardAllianceAction(requesterId, "sent_rejected");
    } catch (err) {
      console.error("Reject failed:", err);
    }
  };

  const handlers = {
    watchlist: handleWatchlist,
    alliance: handleSendAlliance,
    accept: handleAcceptAlliance,
    reject: handleRejectAlliance,
    compare: handleOpenCompare,
  };

  // --- FILTER ENGINE ---
  const filteredNetwork = useMemo(() => {
    return dbUsers.filter((u) => {
      // 1. Tab Routing
      if (activeTab === "The Watchlist") {
        if (!currentUserObj?.watchlist?.includes(u.id)) return false;
      } else if (activeTab === "My Alliance") {
        // Main grid ONLY shows accepted allies
        const isAllied = currentUserObj?.allies?.includes(u.id);
        if (!isAllied) return false;
      } else if (activeTab === "Alumni") {
        if (!currentUserObj?._institution) return false; // Need institution
        if (u._institution !== currentUserObj._institution) return false;
        if (u.id === currentUserObj?.id) return false; // Hide self
      } else {
        // Global Arena
        if (u.id === currentUserObj?.id) return false; // Hide self
      }

      // 2. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !`${u._firstName} ${u._lastName}`.toLowerCase().includes(q) &&
          !u._username.toLowerCase().includes(q) &&
          !u._niche.toLowerCase().includes(q)
        )
          return false;
      }

      // 3. Dynamic Filters
      if (
        filters.scope === "Academic Institutions" &&
        u._institution !== currentUserObj?._institution
      )
        return false;
      if (filters.domain !== "All Domains" && u._domain !== filters.domain)
        return false;

      return true;
    });
  }, [dbUsers, filters, activeTab, showRequests, searchQuery, currentUserObj]);

  const totalPages = Math.max(1, Math.ceil(filteredNetwork.length / limit));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);
  const paginatedNetwork = filteredNetwork.slice(
    (page - 1) * limit,
    page * limit,
  );

  // Compute Rank for Display
  const getRank = (userId) => {
    return dbUsers.findIndex((u) => u.id === userId) + 1;
  };

  return (
    <div className="bg-[#030303] min-h-screen w-full overflow-x-clip text-white selection:bg-white selection:text-black pb-20 relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      <div className="max-w-[1400px] mx-auto px-4 md:px-12 relative z-10 pt-12 space-y-10 md:space-y-12">
        {/* --- HEADER --- */}
        <div className="text-center md:text-left">
          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tighter text-white mb-2 leading-none">
            Networking Hub.
          </h1>
          <p className="text-sm md:text-xl text-[#888] font-medium tracking-tight">
            Connect, collaborate, and benchmark your progress.
          </p>
        </div>

        {/* --- TAB & SEARCH ENGINE --- */}
        {/* --- TAB & SEARCH ENGINE --- */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 border-b border-[#222] pb-6">
          {/* Added overflow-y-hidden and removed negative margins to fix vertical scroll bug */}
          <div className="flex gap-6 text-xs md:text-sm font-bold overflow-x-auto overflow-y-hidden w-full xl:w-auto custom-scrollbar border-b border-transparent">
            {TABS.map((tab) => {
              let Icon = Globe;
              if (tab === "The Watchlist") Icon = Target;
              if (tab === "My Alliance") Icon = Users;
              if (tab === "Alumni") Icon = GraduationCap;

              // Notification dot for inbound requests
              const showDot =
                tab === "My Alliance" &&
                currentUserObj?.inboundRequests?.length > 0;

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setPage(1);
                  }}
                  className={cn(
                    "pb-4 whitespace-nowrap transition-colors flex items-center gap-2 relative border-b-2",
                    activeTab === tab
                      ? "text-white border-white"
                      : "text-[#666] hover:text-white border-transparent",
                  )}
                >
                  <Icon className="w-4 h-4" /> {tab}
                  {showDot && (
                    <span className="absolute top-0 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center bg-[#0a0a0a] rounded-xl px-4 py-2.5 md:py-3 border border-[#222] focus-within:border-[#555] transition-colors w-full xl:w-80 group shrink-0">
            <Search className="w-4 h-4 text-[#444] group-focus-within:text-white shrink-0" />
            <input
              type="text"
              placeholder="Query by name, @handle, niche..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent border-none outline-none text-xs px-3 text-white placeholder-[#444] font-medium"
            />
          </div>
        </div>

        {/* --- DYNAMIC FILTER HEADER --- */}
        <div className="bg-[#0a0a0a] border border-[#222] p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-2xl relative z-30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <h3 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-1.5 md:gap-2">
              <Filter className="w-3 h-3 md:w-4 md:h-4" /> Radar Engine
            </h3>
            <div className="px-2 md:px-3 py-0.5 md:py-1 bg-[#111] rounded border border-[#333] text-[8px] md:text-[10px] font-mono text-[#888]">
              {filteredNetwork.length} Operators
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto w-full md:w-auto">
            {/* LinkedIn-style Alliance Requests Toggle */}
            <AnimatePresence>
              {activeTab === "My Alliance" && (
                <motion.button
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  onClick={() => {
                    setShowRequests(!showRequests);
                    setPage(1);
                  }}
                  className={cn(
                    "px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 border transition-colors flex-1 md:flex-none justify-center",
                    showRequests
                      ? "bg-white text-black border-white"
                      : "bg-[#111] text-[#888] border-[#333] hover:text-white",
                  )}
                >
                  <Inbox className="w-3 h-3" />{" "}
                  {showRequests ? "View Allies" : "Manage Requests"}
                  {!showRequests &&
                    currentUserObj?.inboundRequests?.length > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">
                        {currentUserObj.inboundRequests.length}
                      </span>
                    )}
                </motion.button>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsFilterMenuOpen(true)}
              className="px-3 md:px-4 py-1.5 md:py-2 bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-[#ccc] transition-colors flex-1 md:flex-none justify-center"
            >
              Filters <Filter className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* --- SLIDE-OUT FILTER DRAWER --- */}
        <AnimatePresence>
          {isFilterMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 z-[400] backdrop-blur-sm"
                onClick={() => setIsFilterMenuOpen(false)}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                ref={filterMenuRef}
                className="fixed right-0 top-0 h-full w-[80vw] sm:w-[50vw] max-w-[320px] bg-[#0a0a0a] border-l border-[#222] z-[500] flex flex-col shadow-[auto_0_100px_rgba(0,0,0,0.9)]"
              >
                <div className="flex justify-between items-center p-5 md:p-6 border-b border-[#222] shrink-0 bg-[#050505]">
                  <h2 className="text-xs md:text-sm font-extrabold tracking-widest uppercase text-white flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#888]" /> Radar Filters
                  </h2>
                  <button
                    onClick={() => setIsFilterMenuOpen(false)}
                    className="p-2 bg-[#111] rounded-full text-[#666] hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6 space-y-6">
                  {isFiltered && (
                    <button
                      onClick={() => {
                        setFilters({
                          scope: "Global Arena",
                          domain: "All Domains",
                        });
                        setSearchQuery("");
                        setPage(1);
                      }}
                      className="w-full text-[10px] font-bold text-red-500 hover:bg-red-500/10 py-2 rounded-lg uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border border-red-500/20"
                    >
                      <X className="w-3 h-3" /> Clear All Filters
                    </button>
                  )}

                  {/* SCOPE FILTER */}
                  <div className="relative">
                    <p className="text-[9px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 pl-1">
                      Scope
                    </p>
                    <button
                      onClick={() =>
                        setActiveDropdown(
                          activeDropdown === "scope" ? null : "scope",
                        )
                      }
                      className="w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-3 bg-[#111] border border-[#222] rounded-xl text-[10px] md:text-xs font-bold text-white hover:border-[#444] transition-colors"
                    >
                      <span className="truncate">{filters.scope}</span>{" "}
                      <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-[#666]" />
                    </button>
                    <AnimatePresence>
                      {activeDropdown === "scope" && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute top-[calc(100%+4px)] left-0 w-full bg-[#1a1a1a] border border-[#333] rounded-xl z-40 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar"
                        >
                          {SCOPES.map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setFilters({ ...filters, scope: s });
                                setActiveDropdown(null);
                                setPage(1);
                              }}
                              className="w-full text-left px-4 py-2.5 text-[10px] font-bold text-[#888] hover:text-white hover:bg-[#222] truncate border-b border-[#222] last:border-0"
                            >
                              {s}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* DOMAIN FILTER */}
                  <div className="relative">
                    <p className="text-[9px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 pl-1">
                      Macro Domain
                    </p>
                    <button
                      onClick={() =>
                        setActiveDropdown(
                          activeDropdown === "domain" ? null : "domain",
                        )
                      }
                      className="w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-3 bg-[#111] border border-[#222] rounded-xl text-[10px] md:text-xs font-bold text-white hover:border-[#444] transition-colors"
                    >
                      <span className="truncate">{filters.domain}</span>{" "}
                      <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-[#666]" />
                    </button>
                    <AnimatePresence>
                      {activeDropdown === "domain" && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute top-[calc(100%+4px)] left-0 w-full bg-[#1a1a1a] border border-[#333] rounded-xl z-40 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar"
                        >
                          {["All Domains", ...Object.keys(DOMAINS)].map((d) => (
                            <button
                              key={d}
                              onClick={() => {
                                setFilters({ ...filters, domain: d });
                                setActiveDropdown(null);
                                setPage(1);
                              }}
                              className="w-full text-left px-4 py-2.5 text-[10px] font-bold text-[#888] hover:text-white hover:bg-[#222] truncate border-b border-[#222] last:border-0"
                            >
                              {d}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* LIMIT FILTER */}
                  <div className="relative">
                    <p className="text-[9px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 pl-1">
                      Display Per Page
                    </p>
                    <button
                      onClick={() =>
                        setActiveDropdown(
                          activeDropdown === "limit" ? null : "limit",
                        )
                      }
                      className="w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-3 bg-[#111] border border-[#222] rounded-xl text-[10px] md:text-xs font-bold text-white hover:border-[#444] transition-colors"
                    >
                      <span className="truncate">{limit} Users</span>{" "}
                      <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-[#666]" />
                    </button>
                    <AnimatePresence>
                      {activeDropdown === "limit" && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute top-[calc(100%+4px)] left-0 w-full bg-[#1a1a1a] border border-[#333] rounded-xl z-40 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar"
                        >
                          {[12, 24, 48].map((l) => (
                            <button
                              key={l}
                              onClick={() => {
                                setLimit(l);
                                setActiveDropdown(null);
                                setPage(1);
                              }}
                              className="w-full text-left px-4 py-2.5 text-[10px] font-bold text-[#888] hover:text-white hover:bg-[#222] border-b border-[#222] last:border-0"
                            >
                              {l}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="p-5 md:p-6 border-t border-[#222] bg-[#050505] shrink-0">
                  <button
                    onClick={() => setIsFilterMenuOpen(false)}
                    className="w-full bg-white text-black py-3 rounded-xl font-extrabold text-xs uppercase tracking-widest hover:bg-[#ccc] transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* --- THE GRID OR REQUESTS VIEW --- */}
        {activeTab === "My Alliance" && showRequests ? (
          <div className="w-full flex flex-col animate-in fade-in duration-300">
            {/* Sub-Tabs (Sent vs Received) */}
            <div className="flex gap-6 border-b border-[#222] mb-6">
              <button
                onClick={() => setRequestTab("sent")}
                className={cn(
                  "pb-3 text-[10px] md:text-xs font-bold uppercase tracking-widest border-b-2 transition-colors",
                  requestTab === "sent"
                    ? "border-white text-white"
                    : "border-transparent text-[#666] hover:text-white",
                )}
              >
                Sent Requests
              </button>
              <button
                onClick={() => setRequestTab("received")}
                className={cn(
                  "pb-3 text-[10px] md:text-xs font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2",
                  requestTab === "received"
                    ? "border-white text-white"
                    : "border-transparent text-[#666] hover:text-white",
                )}
              >
                Received Requests
                {currentUserObj?.inboundRequests?.length > 0 && (
                  <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                    {currentUserObj.inboundRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Horizontal LinkedIn-Style List View */}
            <div className="flex flex-col gap-3">
              {(() => {
                const reqUsers = dbUsers.filter((u) =>
                  requestTab === "sent"
                    ? currentUserObj?.outboundRequests?.includes(u.id)
                    : currentUserObj?.inboundRequests?.includes(u.id),
                );

                if (reqUsers.length === 0) {
                  return (
                    <div className="py-16 text-center border border-dashed border-[#222] rounded-2xl bg-[#050505]">
                      <p className="text-[#666] text-xs uppercase tracking-widest font-mono">
                        No {requestTab} requests.
                      </p>
                    </div>
                  );
                }

                return reqUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0a0a] border border-[#222] p-4 md:p-5 rounded-2xl hover:border-[#444] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#111] border border-[#333] flex items-center justify-center text-sm font-extrabold text-[#888] shrink-0">
                        {user._initials}
                      </div>
                      <div>
                        <Link
                          to={`/user/${user._username}`}
                          className="font-extrabold text-white text-sm md:text-base hover:underline"
                        >
                          {user._firstName} {user._lastName}
                        </Link>
                        <p className="text-[10px] md:text-xs text-[#888] font-medium mt-0.5 uppercase tracking-wider">
                          {user._domain} • {user._niche}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0">
                      {requestTab === "received" ? (
                        <>
                          <button
                            onClick={() => handlers.reject(user.id)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-[#111] text-[#888] border border-[#333] text-xs font-bold rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors"
                          >
                            Ignore
                          </button>
                          <button
                            onClick={() => handlers.accept(user.id)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-white text-black border border-white text-xs font-extrabold rounded-xl hover:bg-[#ccc] transition-colors"
                          >
                            Accept
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-[#222] rounded-lg">
                          <Clock className="w-3 h-3 text-[#666]" />
                          <span className="text-[10px] font-mono text-[#666] tracking-widest">
                            PENDING
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        ) : paginatedNetwork.length === 0 ? (
          <div className="py-20 md:py-32 flex flex-col items-center justify-center text-center border border-[#222] rounded-2xl md:rounded-[2rem] bg-[#050505] px-4 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
            <div className="w-16 h-16 rounded-full bg-[#111] flex items-center justify-center mb-6">
              <Target className="w-8 h-8 text-[#444]" />
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold text-white mb-2">
              No Operators Found.
            </h3>
            <p className="text-[#888] text-xs md:text-sm max-w-md leading-relaxed">
              {activeTab === "The Watchlist"
                ? "No operators in your crosshairs. Add targets from the Global Arena."
                : activeTab === "My Alliance"
                  ? "No active alliances or pending requests."
                  : "No profiles match your current filter parameters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {paginatedNetwork.map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.5) }}
              >
                <OperatorCard
                  user={user}
                  currentUser={currentUserObj}
                  isWatchlist={activeTab === "The Watchlist"}
                  handlers={handlers}
                  rank={getRank(user.id)}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* --- SMART PAGINATION ENGINE --- */}
        {totalPages > 0 && !(activeTab === "My Alliance" && showRequests) && (
          <div className="bg-[#050505] border border-[#222] rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-4 flex items-center justify-between shadow-2xl">
            <span className="text-[8px] md:text-[10px] font-mono text-[#666] tracking-widest hidden sm:block">
              {filteredNetwork.length} OPERATORS
            </span>

            <div className="flex items-center gap-1 md:gap-2 mx-auto sm:mx-0">
              <button
                disabled={page === 1}
                onClick={() => setPage(1)}
                className="p-1.5 md:p-2 bg-[#111] border border-[#333] rounded-lg text-white hover:bg-[#222] disabled:opacity-30 transition-colors"
              >
                <ChevronsLeft className="w-3 h-3 md:w-4 md:h-4" />
              </button>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 md:p-2 bg-[#111] border border-[#333] rounded-lg text-white hover:bg-[#222] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
              </button>

              {/* Jump-To Page Dropdown */}
              <div className="relative mx-1 md:mx-2" ref={pageDropdownRef}>
                <button
                  onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white font-mono text-[10px] md:text-xs font-bold hover:bg-[#222] transition-colors"
                >
                  {page} <span className="text-[#666]">/ {totalPages}</span>{" "}
                  <ChevronDown className="w-3 h-3 text-[#666]" />
                </button>
                <AnimatePresence>
                  {isPageDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-16 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-[0_-10px_40px_rgba(0,0,0,0.8)] max-h-40 overflow-y-auto custom-scrollbar z-50"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <button
                            key={p}
                            onClick={() => {
                              setPage(p);
                              setIsPageDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full py-2 text-[10px] font-mono text-center transition-colors border-b border-[#222] last:border-0",
                              p === page
                                ? "bg-white text-black font-extrabold"
                                : "text-[#888] hover:text-white hover:bg-[#222]",
                            )}
                          >
                            {p}
                          </button>
                        ),
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 md:p-2 bg-[#111] border border-[#333] rounded-lg text-white hover:bg-[#222] disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                className="p-1.5 md:p-2 bg-[#111] border border-[#333] rounded-lg text-white hover:bg-[#222] disabled:opacity-30 transition-colors"
              >
                <ChevronsRight className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- WHATSAPP STYLE AI TERMINAL / PRO MODAL --- */}
      <AnimatePresence>
        {isCompareOpen && (
          <CompareTerminal
            isOpen={isCompareOpen}
            onClose={() => setIsCompareOpen(false)}
            targetUser={compareTarget}
            currentUser={currentUserObj}
          />
        )}

        {isProModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-6 md:p-8 text-center shadow-2xl"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold text-white mb-2">
                Protocol Locked
              </h3>
              <p className="text-[#888] text-xs md:text-sm mb-6 md:mb-8 leading-relaxed">
                The Free tier is limited to 1 AI Comparison per day. Upgrade
                your clearance to Discotive Pro to unlock up to 3 deep-dive
                comparisons daily.
              </p>
              <div className="flex gap-3 md:gap-4">
                <button
                  onClick={() => setIsProModalOpen(false)}
                  className="flex-1 py-2.5 md:py-3 bg-[#111] border border-[#333] text-white text-xs md:text-sm font-bold rounded-xl hover:bg-[#222] transition-colors"
                >
                  Cancel
                </button>
                <Link
                  to="/premium"
                  className="flex-1 py-2.5 md:py-3 bg-white text-black text-xs md:text-sm font-extrabold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-center"
                >
                  Upgrade to Pro
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Network;
