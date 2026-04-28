/**
 * @fileoverview LearnPortfolio.jsx — Pro User Learning Portfolio
 * @description
 * A premium-gated, full-screen Netflix-style overlay where operators curate their
 * completed learning assets. Features fluid animations, grouping by content type,
 * visibility toggling, and shareable links.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  X,
  Share2,
  Lock,
  Trash2,
  Globe,
  EyeOff,
  Play,
  BookOpen,
  Headphones,
  FileText,
  Star,
  Award,
} from "lucide-react";
import { TYPE_CONFIG, getYouTubeThumbnail } from "../../lib/discotiveLearn";

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.2)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
  border: "rgba(255,255,255,0.06)",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

// ─── Icons mapping ─────────────────────────────────────────────────────────────
const TypeIcon = ({ type, size = 14, color }) => {
  const icons = {
    course: BookOpen,
    video: Play,
    podcast: Headphones,
    resource: FileText,
  };
  const Icon = icons[type] || BookOpen;
  return (
    <Icon size={size} color={color || TYPE_CONFIG[type]?.color || G.base} />
  );
};

// ─── Subcomponents ─────────────────────────────────────────────────────────────

const PremiumGate = ({ onClose, isMobile }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(3,3,3,0.95)",
      backdropFilter: "blur(12px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <button
      onClick={onClose}
      style={{
        position: "absolute",
        top: 24,
        right: 24,
        background: V.surface,
        border: `1px solid ${V.border}`,
        color: T.primary,
        width: 40,
        height: 40,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 10,
      }}
    >
      <X size={20} />
    </button>

    <motion.div
      initial={{ scale: 0.95, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      style={{
        background: V.elevated,
        border: `1px solid ${G.border}`,
        borderRadius: 24,
        padding: isMobile ? 30 : 50,
        maxWidth: 500,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background: `radial-gradient(circle at center, ${G.dimBg} 0%, transparent 60%)`,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${G.base}, ${G.bright})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: `0 0 30px ${G.dimBg}`,
          }}
        >
          <Lock size={32} color="#000" />
        </div>
        <h2
          style={{
            fontSize: isMobile ? 24 : 32,
            fontWeight: 800,
            color: T.primary,
            fontFamily: "'Montserrat', sans-serif",
            marginBottom: 16,
          }}
        >
          PRO PORTFOLIO
        </h2>
        <p
          style={{
            fontSize: 14,
            color: T.secondary,
            lineHeight: 1.6,
            fontFamily: "'Poppins', sans-serif",
            marginBottom: 32,
          }}
        >
          Curate a verifiable learning portfolio. Showcase your completed
          courses, masterclasses, and technical resources to the world with a
          public link. Stop telling people what you know. Show them.
        </p>
        <button
          style={{
            background: `linear-gradient(135deg, ${G.base}, ${G.bright})`,
            color: "#000",
            border: "none",
            padding: "16px 32px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "'Montserrat', sans-serif",
            letterSpacing: "0.05em",
            cursor: "pointer",
            width: "100%",
            textTransform: "uppercase",
          }}
          onClick={() => {
            // Logic to redirect to upgrade
            window.location.href = "/premium";
          }}
        >
          Upgrade to Pro
        </button>
      </div>
    </motion.div>
  </motion.div>
);

const PortfolioItemCard = ({
  item,
  onDelete,
  onToggleVisibility,
  isMobile,
}) => {
  const [hovered, setHovered] = useState(false);
  const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.course;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onHoverStart={() => !isMobile && setHovered(true)}
      onHoverEnd={() => !isMobile && setHovered(false)}
      style={{
        background: V.surface,
        borderRadius: 0, // Borderless design
        border: `1px solid ${hovered ? typeConfig.border : V.border}`,
        overflow: "hidden",
        position: "relative",
        transition: "border 0.3s ease",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          aspectRatio: "16/9",
          position: "relative",
          background: V.depth,
        }}
      >
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${V.surface}, ${V.depth})`,
            }}
          >
            <TypeIcon
              type={item.type}
              size={40}
              color={typeConfig.color + "40"}
            />
          </div>
        )}

        {/* Visibility Badge */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(item.id, !item.isPublic);
          }}
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            padding: "4px 8px",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            border: `1px solid ${item.isPublic ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}
        >
          {item.isPublic ? (
            <Globe size={10} color="#4ADE80" />
          ) : (
            <EyeOff size={10} color="#EF4444" />
          )}
          <span
            style={{
              fontSize: 8,
              fontWeight: 800,
              color: item.isPublic ? "#4ADE80" : "#EF4444",
              fontFamily: "'Montserrat', sans-serif",
              letterSpacing: "0.1em",
            }}
          >
            {item.isPublic ? "PUBLIC" : "PRIVATE"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <TypeIcon type={item.type} size={12} color={typeConfig.color} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: typeConfig.color,
              fontFamily: "'Montserrat', sans-serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {typeConfig.label}
          </span>
          <span
            style={{
              fontSize: 9,
              color: T.dim,
              marginLeft: "auto",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {item.platform}
          </span>
        </div>

        <h4
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.primary,
            fontFamily: "'Poppins', sans-serif",
            margin: 0,
            marginBottom: 12,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.4,
          }}
        >
          {item.title}
        </h4>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: T.secondary,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Added: {new Date(item.addedAt?.seconds * 1000).toLocaleDateString()}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: T.dim,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 4,
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.dim)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const LearnPortfolio = ({ uid, userData, isPremium, onClose, isMobile }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch logic
  const fetchPortfolio = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "users", uid, "learn_portfolio"),
        orderBy("completedAt", "desc"),
      );
      const snap = await getDocs(q);
      setItems(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Handlers
  const handleDelete = async (docId) => {
    if (!window.confirm("Remove this item from your portfolio?")) return;
    try {
      await deleteDoc(doc(db, "users", uid, "learn_portfolio", docId));
      setItems((prev) => prev.filter((i) => i.id !== docId));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleToggleVisibility = async (docId, newStatus) => {
    try {
      await updateDoc(doc(db, "users", uid, "learn_portfolio", docId), {
        isPublic: newStatus,
      });
      setItems((prev) =>
        prev.map((i) => (i.id === docId ? { ...i, isPublic: newStatus } : i)),
      );
    } catch (error) {
      console.error("Error updating visibility:", error);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/@${userData?.handle}/learning`;
    navigator.clipboard.writeText(url);
    alert("Public Portfolio Link Copied!");
  };

  // Grouping
  const grouped = useMemo(() => {
    const groups = { course: [], video: [], podcast: [], resource: [] };
    items.forEach((item) => {
      if (groups[item.type]) groups[item.type].push(item);
    });
    return groups;
  }, [items]);

  if (!isPremium) {
    return <PremiumGate onClose={onClose} isMobile={isMobile} />;
  }

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      style={{
        position: "fixed",
        inset: 0,
        background: V.bg,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          height: 80,
          borderBottom: `1px solid ${V.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "0 20px" : "0 40px",
          background: V.surface,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: G.dimBg,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Award size={20} color={G.base} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: T.primary,
                fontFamily: "'Montserrat', sans-serif",
                margin: 0,
                letterSpacing: "0.02em",
              }}
            >
              LEARN PORTFOLIO
            </h1>
            <p
              style={{
                fontSize: 11,
                color: T.secondary,
                fontFamily: "'Poppins', sans-serif",
                margin: 0,
              }}
            >
              Curated proof of your intellectual curiosity.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleCopyLink}
            style={{
              background: "transparent",
              border: `1px solid ${V.border}`,
              color: T.primary,
              height: 36,
              padding: "0 16px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Montserrat', sans-serif",
              cursor: "pointer",
            }}
          >
            <Share2 size={14} />
            {!isMobile && "Share Public Link"}
          </button>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: V.elevated,
              border: `1px solid ${V.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.primary,
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Content Area */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: isMobile ? 20 : 40,
        }}
      >
        {loading ? (
          <div
            style={{
              color: T.dim,
              textAlign: "center",
              marginTop: 100,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Loading portfolio...
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              color: T.secondary,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <Star size={48} color={T.dim} style={{ marginBottom: 16 }} />
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: T.primary,
                marginBottom: 8,
              }}
            >
              Your Portfolio is Empty
            </h3>
            <p style={{ fontSize: 13, maxWidth: 300 }}>
              Complete courses, watch videos, and read resources to add them
              here and build your public knowledge base.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 40,
              paddingBottom: 60,
            }}
          >
            {/* Render rows for each category that has items */}
            {Object.entries(grouped).map(([type, typeItems]) => {
              if (typeItems.length === 0) return null;
              const typeConfig = TYPE_CONFIG[type];

              return (
                <section key={type}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    <TypeIcon type={type} size={18} color={typeConfig.color} />
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: T.primary,
                        fontFamily: "'Montserrat', sans-serif",
                        margin: 0,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      {typeConfig.plural}
                    </h3>
                    <div
                      style={{
                        marginLeft: 8,
                        background: V.elevated,
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 10,
                        color: T.secondary,
                        border: `1px solid ${V.border}`,
                      }}
                    >
                      {typeItems.length}
                    </div>
                  </div>

                  {/* Grid Layout for items */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: 20,
                    }}
                  >
                    <AnimatePresence>
                      {typeItems.map((item) => (
                        <PortfolioItemCard
                          key={item.id}
                          item={item}
                          isMobile={isMobile}
                          onDelete={handleDelete}
                          onToggleVisibility={handleToggleVisibility}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </motion.div>
  );
};

export default LearnPortfolio;
