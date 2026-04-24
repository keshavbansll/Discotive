/**
 * @fileoverview Discotive Colists v2 — Editor Engine
 */
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Cropper from "react-easy-crop";
import { cn } from "../../lib/cn";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  X,
  Plus,
  Image as ImageIcon,
  GitFork,
  Link2,
  Headphones,
  Play,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Strikethrough,
  Quote as QuoteIcon,
  List,
  ListOrdered,
  Minus,
  Undo,
  Redo,
  Save,
  Cloud,
  Globe,
  Crop,
  Check,
  Copy,
  Code,
  Youtube,
  Zap,
  ExternalLink,
  Quote,
} from "lucide-react";

import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import { HexColorPicker } from "react-colorful";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";

import {
  G,
  V,
  T,
  COVER_GRADIENTS,
  createBlockId,
  generateSlug,
} from "../../lib/colistConstants";

const THEME_TEXT_COLORS = [
  "#000000",
  "#F5F0E8",
  "#F5F0E8",
  "#F5F0E8",
  "#F5F0E8",
  "#F5F0E8",
  "#F5F0E8",
  "#F5F0E8",
];

const PRESET_COLORS = [
  "#ffffff",
  "#F5F0E8",
  "#000000",
  "#BFA264",
  "#F87171",
  "#38bdf8",
  "#4ADE80",
  "#A855F7",
  "#FBBF24",
  "#FB7185",
  "#818CF8",
  "#C084FC",
];

/* ─── Canvas Cropping Utility ────────────────────────────────────────────── */
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 1280;
  canvas.height = 720;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    1280,
    720,
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/jpeg",
      0.85,
    );
  });
};

/* ─── Block Renderers ─────────────────────────────────────────────────────── */
const InsightBlock = memo(({ block }) => (
  <div className="h-full flex flex-col justify-center px-8 md:px-16 py-12">
    <div className="flex items-center gap-2 mb-6">
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center"
        style={{ background: G.dimBg }}
      >
        <Zap size={12} style={{ color: G.bright }} />
      </div>
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: G.base }}
      >
        Insight
      </span>
    </div>
    {block.title && (
      <h2
        className="font-display font-black leading-tight mb-6"
        style={{
          fontSize: "clamp(1.6rem,4vw,3rem)",
          color: T.primary,
          letterSpacing: "-0.03em",
        }}
      >
        {block.title}
      </h2>
    )}
    <div
      className="text-lg md:text-xl leading-relaxed font-light max-w-3xl prose-invert"
      style={{ color: T.secondary }}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  </div>
));

const QuoteBlock = memo(({ block }) => (
  <div className="h-full flex flex-col justify-center px-8 md:px-16 py-12">
    <div className="flex items-center gap-2 mb-6">
      <Quote size={12} style={{ color: "#a855f7" }} />
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: "#a855f7" }}
      >
        Quote
      </span>
    </div>
    <div style={{ borderLeft: `3px solid #a855f7`, paddingLeft: 32 }}>
      <blockquote
        className="font-display font-black leading-tight mb-6"
        style={{
          fontSize: "clamp(1.8rem,4.5vw,3.5rem)",
          color: T.primary,
          letterSpacing: "-0.04em",
          fontStyle: "italic",
        }}
      >
        "{block.content}"
      </blockquote>
      {block.author && (
        <p
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: "#a855f7" }}
        >
          — {block.author}
        </p>
      )}
    </div>
  </div>
));

const LinkBlock = memo(({ block }) => {
  const hostname = useMemo(() => {
    try {
      return new URL(block.url || "").hostname.replace("www.", "");
    } catch {
      return block.url || "";
    }
  }, [block.url]);
  return (
    <div className="h-full flex flex-col justify-center px-8 md:px-16 py-12">
      <div className="flex items-center gap-2 mb-6">
        <Link2 size={12} style={{ color: "#38bdf8" }} />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "#38bdf8" }}
        >
          Resource
        </span>
      </div>
      <div
        className="max-w-2xl p-8 rounded-3xl border"
        style={{
          background: "rgba(56,189,248,0.05)",
          borderColor: "rgba(56,189,248,0.2)",
        }}
      >
        <div className="flex items-start gap-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(56,189,248,0.12)" }}
          >
            <Link2 size={22} style={{ color: "#38bdf8" }} />
          </div>
          <div className="flex-1 min-w-0">
            {block.title && (
              <h3
                className="text-xl font-black mb-2"
                style={{ color: T.primary }}
              >
                {block.title}
              </h3>
            )}
            {hostname && (
              <p className="text-xs font-mono mb-3" style={{ color: T.dim }}>
                {hostname}
              </p>
            )}
            {block.description && (
              <p
                className="text-sm leading-relaxed mb-6"
                style={{ color: T.secondary }}
              >
                {block.description}
              </p>
            )}
            {block.url && (
              <a
                href={block.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full"
                style={{
                  background: "rgba(56,189,248,0.12)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56,189,248,0.25)",
                }}
              >
                Open <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const CodeBlock = memo(({ block }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(block.content || "").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [block.content]);

  return (
    <div className="h-full flex flex-col justify-center px-8 md:px-16 py-12">
      <div className="flex items-center gap-2 mb-6">
        <Code size={12} style={{ color: "#4ADE80" }} />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "#4ADE80" }}
        >
          Code
        </span>
      </div>
      <div
        className="max-w-3xl rounded-2xl overflow-hidden"
        style={{
          background: "#0d1117",
          border: "1px solid rgba(74,222,128,0.2)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            background: "rgba(74,222,128,0.06)",
            borderBottom: "1px solid rgba(74,222,128,0.12)",
          }}
        >
          <div className="flex items-center gap-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{
                  background:
                    i === 0 ? "#F87171" : i === 1 ? "#FBBF24" : "#4ADE80",
                  opacity: 0.7,
                }}
              />
            ))}
            <span
              className="text-[9px] font-black uppercase tracking-widest ml-2"
              style={{ color: "#4ADE80" }}
            >
              {block.language || "code"}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-all"
            style={{ color: copied ? "#4ADE80" : "rgba(255,255,255,0.3)" }}
          >
            {copied ? (
              <>
                <Check size={10} /> Copied
              </>
            ) : (
              <>
                <Copy size={10} /> Copy
              </>
            )}
          </button>
        </div>
        <pre
          className="p-5 overflow-x-auto text-sm font-mono leading-relaxed custom-scrollbar"
          style={{ color: "#e6edf3", margin: 0, maxHeight: "50vh" }}
        >
          <code>{block.content}</code>
        </pre>
      </div>
    </div>
  );
});

const VideoBlock = memo(({ block }) => {
  const [playing, setPlaying] = useState(false);
  const ytId =
    block.youtubeId || block.url?.match(/(?:v=|youtu\.be\/)([^&\s?]+)/)?.[1];

  if (!ytId) return null;
  return (
    <div className="h-full flex flex-col justify-center items-center px-8 md:px-16 py-12">
      <div className="flex items-center gap-2 mb-6 self-start">
        <Youtube size={12} style={{ color: "#F87171" }} />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "#F87171" }}
        >
          Video
        </span>
      </div>
      {block.title && (
        <h3
          className="text-base font-bold mb-6 self-start max-w-2xl"
          style={{ color: "var(--editor-text-color, inherit)" }}
        >
          {block.title}
        </h3>
      )}
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{
          aspectRatio: "16/9",
          border: "1px solid rgba(248,113,113,0.2)",
        }}
      >
        {!playing ? (
          <div
            className="relative w-full h-full cursor-pointer group/vid"
            onClick={() => setPlaying(true)}
          >
            <img
              src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
              alt=""
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute top-4 right-4 bg-black rounded-lg p-2 z-20 group-hover/vid:opacity-0 transition-opacity duration-300 shadow-lg border border-white/5 pointer-events-none">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="gold-grad-vid"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#8B7240" />
                    <stop offset="50%" stopColor="#D4AF78" />
                    <stop offset="100%" stopColor="#E8D5A3" />
                  </linearGradient>
                </defs>
                <path
                  d="M21.582 6.186a2.665 2.665 0 0 0-1.876-1.886C18.05 3.843 12 3.843 12 3.843s-6.05 0-7.706.457A2.665 2.665 0 0 0 2.418 6.186C1.961 7.843 1.961 12 1.961 12s0 4.157.457 5.814a2.665 2.665 0 0 0 1.876 1.886C5.95 20.157 12 20.157 12 20.157s6.05 0 7.706-.457a2.665 2.665 0 0 0 1.876-1.886c.457-1.657.457-5.814.457-5.814s0-4.157-.457-5.814Z"
                  fill="url(#gold-grad-vid)"
                />
                <path
                  d="M9.98 15.502v-7.004l6.236 3.502-6.236 3.502Z"
                  fill="#000"
                />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-30">
              <motion.div
                whileHover={{ scale: 1.12 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(248,113,113,0.9)",
                  boxShadow: "0 0 50px rgba(248,113,113,0.5)",
                }}
              >
                <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-2" />
              </motion.div>
            </div>
          </div>
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&modestbranding=1&rel=0`}
            className="w-full h-full"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
          />
        )}
      </div>
    </div>
  );
});

const DividerBlock = memo(() => (
  <div className="h-full flex flex-col items-center justify-center gap-4">
    <div className="flex items-center gap-4">
      <div
        className="w-32 h-px"
        style={{
          background:
            "linear-gradient(to right,transparent,rgba(191,162,100,0.3),transparent)",
        }}
      />
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: G.base, opacity: 0.6 }}
      />
      <div
        className="w-32 h-px"
        style={{
          background:
            "linear-gradient(to left,transparent,rgba(191,162,100,0.3),transparent)",
        }}
      />
    </div>
    <p
      className="text-xs font-bold uppercase tracking-widest"
      style={{ color: T.dim }}
    >
      Section Break
    </p>
  </div>
));

const PodcastBlock = memo(({ block }) => {
  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return null;
    let parsed = rawUrl;

    if (parsed.includes("/embed/")) return parsed;
    if (parsed.includes("open.spotify.com")) {
      parsed = parsed.replace("open.spotify.com/", "open.spotify.com/embed/");
    }
    if (
      parsed.includes("podcasts.apple.com") &&
      !parsed.includes("embed.podcasts.apple.com")
    ) {
      parsed = parsed.replace("podcasts.apple.com", "embed.podcasts.apple.com");
    }
    return parsed;
  };

  const embedUrl = getEmbedUrl(block.url);
  if (!embedUrl) return null;

  const isSpotify = embedUrl.includes("spotify");

  return (
    <div className="h-full flex flex-col justify-center items-center px-8 md:px-16 py-12">
      <div className="flex items-center gap-2 mb-6 self-start">
        <Headphones size={12} style={{ color: "#A855F7" }} />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "#A855F7" }}
        >
          Podcast Episode
        </span>
      </div>
      {block.title && (
        <h3
          className="text-base font-bold mb-6 self-start max-w-2xl"
          style={{ color: "var(--editor-text-color, inherit)" }}
        >
          {block.title}
        </h3>
      )}
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: "1px solid rgba(168,85,247,0.2)" }}
      >
        <iframe
          src={embedUrl}
          width="100%"
          height={isSpotify ? "152" : "175"}
          frameBorder="0"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          style={{ background: "transparent" }}
        />
      </div>
    </div>
  );
});

const PodcastNodeView = ({ node, updateAttributes, deleteNode }) => {
  const [editingLink, setEditingLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [playing, setPlaying] = useState(false);
  const { url, title } = node.attrs;

  const handleUpdate = () => {
    if (!newLink.trim()) return setEditingLink(false);
    let finalUrl = newLink.trim();
    const iframeMatch = finalUrl.match(/<iframe.*?src=["'](.*?)["']/i);
    if (iframeMatch) {
      finalUrl = iframeMatch[1];
    }
    updateAttributes({ url: finalUrl });
    setEditingLink(false);
  };

  const isSpotify = url?.includes("spotify");

  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return null;
    let parsed = rawUrl;
    if (parsed.includes("/embed/")) return parsed;
    if (parsed.includes("open.spotify.com")) {
      parsed = parsed.replace("open.spotify.com/", "open.spotify.com/embed/");
    }
    if (
      parsed.includes("podcasts.apple.com") &&
      !parsed.includes("embed.podcasts.apple.com")
    ) {
      parsed = parsed.replace("podcasts.apple.com", "embed.podcasts.apple.com");
    }
    return parsed;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <NodeViewWrapper className="my-8" data-drag-handle>
      <div
        className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden group border border-white/10 shadow-2xl bg-[#0A0A0A] p-4"
        onMouseLeave={() => setPlaying(false)}
      >
        {embedUrl ? (
          <iframe
            src={embedUrl}
            width="100%"
            height={isSpotify ? "152" : "175"}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        ) : (
          <div className="w-full h-[152px] bg-[#111] flex flex-col items-center justify-center gap-3 text-white/50">
            <Headphones size={32} className="opacity-50" />
            <span className="text-xs font-bold uppercase tracking-widest">
              No Podcast Linked
            </span>
          </div>
        )}

        {!playing && (
          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm z-30">
            <button
              onClick={deleteNode}
              className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-500/30 shadow-lg"
            >
              <X size={20} />
            </button>
            {embedUrl && (
              <button
                onClick={() => setPlaying(true)}
                className="w-16 h-16 rounded-full bg-[#4ADE80]/20 text-[#4ADE80] flex items-center justify-center hover:bg-[#4ADE80] hover:text-black transition-all border border-[#4ADE80]/30 hover:scale-110 shadow-[0_0_30px_rgba(74,222,128,0.3)]"
              >
                <Play size={28} className="ml-1" fill="currentColor" />
              </button>
            )}
            <button
              onClick={() => {
                setEditingLink(true);
                setNewLink(url || "");
              }}
              className="w-12 h-12 rounded-full bg-[#A855F7]/20 text-[#A855F7] flex items-center justify-center hover:bg-[#A855F7] hover:text-white transition-all border border-[#A855F7]/30 shadow-lg"
            >
              <Link2 size={20} />
            </button>
          </div>
        )}

        <AnimatePresence>
          {editingLink && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-2xl border-t border-white/10 z-30 flex items-center gap-3"
            >
              <input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Paste Spotify or Apple Podcast link..."
                className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
              />
              <button
                onClick={handleUpdate}
                className="px-6 py-3 rounded-xl text-xs font-black text-black bg-[#A855F7]"
              >
                Update
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <textarea
        value={title}
        onChange={(e) => updateAttributes({ title: e.target.value })}
        placeholder="Episode Takeaway..."
        className="mt-3 text-center font-bold text-sm bg-transparent border-b-2 border-transparent hover:border-white/10 focus:border-white/30 outline-none transition-all px-4 py-1 w-full resize-none overflow-hidden"
        style={{ color: "var(--editor-text-color)" }}
        rows={1}
      />
    </NodeViewWrapper>
  );
};

const EnhancedPodcast = Node.create({
  name: "enhancedPodcast",
  group: "block",
  atom: true,
  addAttributes() {
    return { url: { default: "" }, title: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-podcast-embed]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-podcast-embed": "" }, HTMLAttributes),
      HTMLAttributes.title,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PodcastNodeView);
  },
});

export const PageBlockRenderer = memo(({ block }) => {
  switch (block.type) {
    case "insight":
      return <InsightBlock block={block} />;
    case "quote":
      return <QuoteBlock block={block} />;
    case "link":
      return <LinkBlock block={block} />;
    case "code":
      return <CodeBlock block={block} />;
    case "video":
      return <VideoBlock block={block} />;
    case "podcast":
      return <PodcastBlock block={block} />;
    case "divider":
      return <DividerBlock />;
    default:
      return null;
  }
});

/* ─── Custom YouTube Node Extension ──────────────────────────────────────── */
const YouTubeNodeView = ({ node, updateAttributes, deleteNode }) => {
  const [editingLink, setEditingLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [playing, setPlaying] = useState(false);
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);

  const { src, videoId, title, customTitle } = node.attrs;

  const extractId = (url) => {
    const match = url?.match(/(?:v=|youtu\.be\/)([^&\s?]+)/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    let isMounted = true;
    const fetchTitle = async () => {
      if (!src || title || customTitle) return;
      try {
        setIsFetchingTitle(true);
        const res = await fetch(
          `https://noembed.com/embed?dataType=json&url=${encodeURIComponent(src)}`,
        );
        const data = await res.json();
        if (isMounted && data && data.title) {
          updateAttributes({ title: data.title });
        }
      } catch {
        if (isMounted) updateAttributes({ title: "YouTube Video" });
      } finally {
        if (isMounted) setIsFetchingTitle(false);
      }
    };
    fetchTitle();
    return () => {
      isMounted = false;
    };
  }, [src, title, customTitle, updateAttributes]);

  const handleUpdateLink = async () => {
    if (!newLink.trim()) {
      setEditingLink(false);
      return;
    }
    const id = extractId(newLink);
    if (!id) {
      setEditingLink(false);
      return;
    }

    const updates = { src: newLink, videoId: id, playing: false };

    if (!customTitle) {
      updateAttributes({ ...updates, title: "Extracting title..." });
      try {
        const res = await fetch(
          `https://noembed.com/embed?dataType=json&url=${encodeURIComponent(newLink)}`,
        );
        const data = await res.json();
        if (data && data.title) {
          updates.title = data.title;
        } else {
          updates.title = "YouTube Video";
        }
      } catch {
        updates.title = "YouTube Video";
      }
    } else {
      updateAttributes(updates);
    }
    setEditingLink(false);
  };

  return (
    <NodeViewWrapper className="my-8" data-drag-handle>
      <div
        className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden group border border-white/10 shadow-2xl bg-[#0A0A0A]"
        style={{ aspectRatio: "16/9" }}
      >
        {!playing ? (
          <>
            {videoId ? (
              <>
                <img
                  src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  className="w-full h-full object-cover transition-all duration-500 opacity-90 group-hover:opacity-40"
                  alt="Thumbnail"
                />
                <div className="absolute top-4 right-4 bg-black rounded-lg p-2 z-20 group-hover:opacity-0 transition-opacity duration-300 shadow-lg border border-white/5 pointer-events-none">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient
                        id="gold-grad-yt"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#8B7240" />
                        <stop offset="50%" stopColor="#D4AF78" />
                        <stop offset="100%" stopColor="#E8D5A3" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M21.582 6.186a2.665 2.665 0 0 0-1.876-1.886C18.05 3.843 12 3.843 12 3.843s-6.05 0-7.706.457A2.665 2.665 0 0 0 2.418 6.186C1.961 7.843 1.961 12 1.961 12s0 4.157.457 5.814a2.665 2.665 0 0 0 1.876 1.886C5.95 20.157 12 20.157 12 20.157s6.05 0 7.706-.457a2.665 2.665 0 0 0 1.876-1.886c.457-1.657.457-5.814.457-5.814s0-4.157-.457-5.814Z"
                      fill="url(#gold-grad-yt)"
                    />
                    <path
                      d="M9.98 15.502v-7.004l6.236 3.502-6.236 3.502Z"
                      fill="#000"
                    />
                  </svg>
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-[#111] flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-white/50" />
              </div>
            )}

            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 backdrop-blur-sm z-30">
              <button
                onClick={deleteNode}
                className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-500/30 hover:scale-110 shadow-lg"
              >
                <X size={24} />
              </button>
              <button
                onClick={() => setPlaying(true)}
                className="w-20 h-20 rounded-full bg-[#4ADE80]/20 text-[#4ADE80] flex items-center justify-center hover:bg-[#4ADE80] hover:text-black transition-all border border-[#4ADE80]/30 hover:scale-110 shadow-[0_0_30px_rgba(74,222,128,0.3)]"
              >
                <Play size={32} className="ml-1.5" fill="currentColor" />
              </button>
              <button
                onClick={() => {
                  setEditingLink(true);
                  setNewLink(src || "");
                }}
                className="w-14 h-14 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] flex items-center justify-center hover:bg-[#38bdf8] hover:text-white transition-all border border-[#38bdf8]/30 hover:scale-110 shadow-lg"
              >
                <Link2 size={24} />
              </button>
            </div>
          </>
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
            className="w-full h-full absolute inset-0"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
          />
        )}

        <AnimatePresence>
          {editingLink && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-2xl border-t border-white/10 z-30 flex items-center gap-3"
            >
              <Link2 size={18} className="text-[#38bdf8] ml-2 shrink-0" />
              <input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Paste new YouTube link..."
                className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#BFA264]/50 transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdateLink();
                }}
              />
              <button
                onClick={handleUpdateLink}
                className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-black transition-all hover:opacity-90 shadow-[0_0_20px_rgba(191,162,100,0.2)] shrink-0"
                style={{
                  background: "linear-gradient(135deg, #8B7240, #D4AF78)",
                }}
              >
                Update
              </button>
              <button
                onClick={() => setEditingLink(false)}
                className="p-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex flex-col items-center justify-center gap-2 group/title relative w-full max-w-[90%] mx-auto">
        <textarea
          ref={(el) => {
            if (el) {
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }
          }}
          value={isFetchingTitle ? "Extracting title..." : title}
          onChange={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
            updateAttributes({ title: e.target.value, customTitle: true });
          }}
          disabled={isFetchingTitle}
          rows={1}
          className={cn(
            "text-center font-bold text-base bg-transparent border-b-2 border-transparent hover:border-white/10 focus:border-white/30 outline-none transition-all px-4 py-1 w-full resize-none overflow-hidden leading-relaxed",
            isFetchingTitle ? "animate-pulse opacity-40" : "",
          )}
          style={{ color: "var(--editor-text-color)" }}
          placeholder="Video Title"
        />
      </div>
    </NodeViewWrapper>
  );
};

const EnhancedYouTube = Node.create({
  name: "enhancedYoutube",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      videoId: { default: null },
      title: { default: "" },
      customTitle: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-youtube-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-youtube-embed": "" }, HTMLAttributes),
      [
        "iframe",
        {
          src: `https://www.youtube.com/embed/${HTMLAttributes.videoId}`,
          style: "width: 100%; aspect-ratio: 16/9; border-radius: 1rem;",
          frameborder: "0",
          allowfullscreen: "true",
        },
      ],
      [
        "h3",
        {
          style:
            "text-align: center; font-weight: bold; margin-top: 1.5rem; font-size: 1rem; line-height: 1.5; color: var(--editor-text-color, inherit); word-wrap: break-word; white-space: normal;",
        },
        HTMLAttributes.title,
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YouTubeNodeView);
  },
});

/* ─── Rich Text Toolbar & Connectors ──────────────────────────────────────── */
const EditorToolbar = memo(({ editor }) => {
  const [showHeadings, setShowHeadings] = useState(false);

  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 mb-4 bg-black/40 backdrop-blur-md rounded-2xl p-2 border border-white/10 w-max overflow-visible relative z-[100]">
      {/* Headings Extension */}
      <div className="relative" onMouseLeave={() => setShowHeadings(false)}>
        <button
          onMouseEnter={() => setShowHeadings(true)}
          className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
        >
          <Heading1 size={16} />
        </button>
        <AnimatePresence>
          {showHeadings && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-full top-0 ml-1 flex items-center gap-1 bg-black/90 border border-white/10 rounded-xl p-1 shadow-2xl"
            >
              {[1, 2, 3].map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level }).run()
                  }
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    editor.isActive("heading", { level })
                      ? "bg-[#BFA264]/20 text-[#BFA264]"
                      : "text-white/50 hover:text-white hover:bg-white/10",
                  )}
                >
                  {level === 1 ? (
                    <Heading1 size={14} />
                  ) : level === 2 ? (
                    <Heading2 size={14} />
                  ) : (
                    <Heading3 size={14} />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("bold")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("italic")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("strike")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <Strikethrough size={16} />
      </button>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Extensions */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("blockquote")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <QuoteIcon size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("bulletList")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("orderedList")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <ListOrdered size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="p-2 rounded-xl text-white/50 hover:bg-white/10 transition-all"
      >
        <Minus size={16} />
      </button>
    </div>
  );
});

/* ─── Paginated TipTap Page ──────────────────────────────────────────────── */
const getNodeTextLength = (node) => {
  if (!node) return 0;
  if (node.type === "text") return (node.text || "").length;
  return (node.content || []).reduce(
    (sum, child) => sum + getNodeTextLength(child),
    0,
  );
};

const TipTapPageEditor = memo(
  ({
    block,
    idx,
    total,
    onUpdate,
    onDelete,
    onMove,
    textColor,
    onAdvancePage,
    onBulkPaste,
    setActiveEditor,
    shouldFocus,
    onFocusConsumed,
  }) => {
    const onUpdateRef = useRef(onUpdate);
    const onAdvancePageRef = useRef(onAdvancePage);
    const onBulkPasteRef = useRef(onBulkPaste);
    const idxRef = useRef(idx);
    const blockRef = useRef(block);
    const onFocusConsumedRef = useRef(onFocusConsumed);

    useEffect(() => {
      onUpdateRef.current = onUpdate;
    }, [onUpdate]);
    useEffect(() => {
      onAdvancePageRef.current = onAdvancePage;
    }, [onAdvancePage]);
    useEffect(() => {
      onBulkPasteRef.current = onBulkPaste;
    }, [onBulkPaste]);
    useEffect(() => {
      idxRef.current = idx;
    }, [idx]);
    useEffect(() => {
      blockRef.current = block;
    }, [block]);
    useEffect(() => {
      onFocusConsumedRef.current = onFocusConsumed;
    }, [onFocusConsumed]);

    const isSplitting = useRef(false);
    const MAX_SLIDE_CHARS = 600;

    const editor = useEditor({
      extensions: [
        StarterKit,
        LinkExtension.configure({ openOnClick: false }),
        EnhancedYouTube,
        EnhancedPodcast,
        Placeholder.configure({ placeholder: "Start typing..." }),
      ],
      content: block._initialJSON || block.content || "",
      editorProps: {
        handlePaste: (view, event) => {
          const text = event.clipboardData?.getData("text/plain")?.trim();
          if (!text) return false;

          let extractedUrl = text;
          const iframeMatch = text.match(/<iframe.*?src=["'](.*?)["']/i);
          if (iframeMatch) extractedUrl = iframeMatch[1];

          const isPodcast =
            /^(https?:\/\/)?(open\.spotify\.com|podcasts\.apple\.com)\/.+$/.test(
              extractedUrl,
            ) ||
            extractedUrl.includes("spotify.com/embed") ||
            extractedUrl.includes("embed.podcasts.apple.com");

          if (isPodcast) {
            event.preventDefault();
            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.enhancedPodcast.create({
                  url: extractedUrl,
                  title: "",
                }),
              ),
            );
            return true;
          }

          const isYoutube =
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(
              extractedUrl,
            ) || extractedUrl.includes("youtube.com/embed/");

          if (isYoutube) {
            const videoId = extractedUrl.match(
              /(?:v=|youtu\.be\/|embed\/)([^&\s?]+)/,
            )?.[1];
            if (videoId) {
              event.preventDefault();
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.enhancedYoutube.create({
                    src: text,
                    videoId,
                    title: "",
                    customTitle: false,
                  }),
                ),
              );
              return true;
            }
          }

          if (text.length > 3000) {
            event.preventDefault();
            const paragraphs = text
              .split(/\n{2,}/)
              .map((p) => p.trim())
              .filter(Boolean);

            const CHARS_PER_SLIDE = MAX_SLIDE_CHARS;
            const chunkNodeArrays = [];
            let currentNodes = [];
            let currentLen = 0;

            for (const para of paragraphs) {
              const paraLen = para.length;
              if (
                currentLen + paraLen > CHARS_PER_SLIDE &&
                currentNodes.length > 0
              ) {
                chunkNodeArrays.push(currentNodes);
                currentNodes = [];
                currentLen = 0;
              }
              currentNodes.push({
                type: "paragraph",
                content: [{ type: "text", text: para }],
              });
              currentLen += paraLen;
            }
            if (currentNodes.length > 0) chunkNodeArrays.push(currentNodes);

            if (chunkNodeArrays.length > 1 && onBulkPasteRef.current) {
              onBulkPasteRef.current(idxRef.current, chunkNodeArrays);
              return true;
            }
          }

          return false;
        },
      },
      onUpdate: ({ editor }) => {
        if (isSplitting.current) return;

        const json = editor.getJSON();
        const nodes = json.content || [];

        onUpdateRef.current(idxRef.current, {
          ...blockRef.current,
          content: editor.getHTML(),
          _initialJSON: null,
        });

        const totalChars = nodes.reduce(
          (sum, node) => sum + getNodeTextLength(node),
          0,
        );
        if (totalChars <= MAX_SLIDE_CHARS) return;

        let charCount = 0;
        let splitIdx = nodes.length;

        for (let i = 0; i < nodes.length; i++) {
          const nodeLen = getNodeTextLength(nodes[i]);
          if (charCount + nodeLen > MAX_SLIDE_CHARS && i >= 1) {
            splitIdx = i;
            break;
          }
          charCount += nodeLen;
        }

        if (splitIdx >= nodes.length) return;

        const keepNodes = nodes.slice(0, splitIdx);
        const overflowNodes = nodes.slice(splitIdx);
        if (overflowNodes.length === 0) return;

        isSplitting.current = true;

        editor.commands.setContent({ type: "doc", content: keepNodes }, false);

        onUpdateRef.current(idxRef.current, {
          ...blockRef.current,
          content: editor.getHTML(),
          _initialJSON: null,
        });

        onAdvancePageRef.current(idxRef.current, {
          type: "doc",
          content: overflowNodes,
        });

        requestAnimationFrame(() => {
          isSplitting.current = false;
        });
      },
      onFocus: ({ editor }) => setActiveEditor(editor),
    });

    useEffect(() => {
      if (shouldFocus && editor) {
        requestAnimationFrame(() => {
          if (!editor.isDestroyed) {
            editor.commands.focus("end");
            onFocusConsumedRef.current?.();
          }
        });
      }
    }, [shouldFocus, editor]);

    return (
      <div className="flex flex-col h-full relative z-10 w-full">
        <span
          className="text-[10px] font-black font-mono tracking-widest mb-4"
          style={{ color: textColor, opacity: 0.5 }}
        >
          PAGE {String(idx + 1).padStart(2, "0")}
        </span>

        <div
          className="flex-1 overflow-hidden tip-tap-container"
          style={{
            color: textColor,
            "--tt-color": textColor,
            maxHeight: "460px",
          }}
        >
          <EditorContent
            editor={editor}
            className="h-full prose-invert w-full outline-none"
          />
        </div>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 backdrop-blur-2xl p-1.5 rounded-[1.2rem] border border-white/10 z-20 shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
          {idx > 0 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Move Left"
              onClick={() => onMove(idx, -1)}
              className="p-2.5 rounded-xl transition-colors hover:bg-white/15"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <ArrowLeft size={14} />
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Undo"
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            className="p-2.5 rounded-xl transition-colors hover:bg-white/15 disabled:opacity-25"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            <Undo size={14} />
          </motion.button>

          <div className="w-px h-4 bg-white/12 mx-0.5" />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Delete Page"
            onClick={() => onDelete(idx)}
            disabled={idx === 0}
            className="p-2.5 rounded-xl transition-colors hover:bg-red-500/20 disabled:opacity-20"
            style={{ color: idx === 0 ? "rgba(255,255,255,0.3)" : "#F87171" }}
          >
            <X size={14} />
          </motion.button>

          <div className="w-px h-4 bg-white/12 mx-0.5" />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Redo"
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            className="p-2.5 rounded-xl transition-colors hover:bg-white/15 disabled:opacity-25"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            <Redo size={14} />
          </motion.button>

          {idx < total - 1 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Move Right"
              onClick={() => onMove(idx, 1)}
              className="p-2.5 rounded-xl transition-colors hover:bg-white/15"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <ArrowRight size={14} />
            </motion.button>
          )}
        </div>
      </div>
    );
  },
);

/* ─── Colist Editor (Horizontal Deck Architecture) ────────────────────────── */
const ColistEditor = memo(
  ({
    onClose,
    userData,
    currentUser,
    onPublish,
    initialColist = null,
    forkOf = null,
  }) => {
    const [coverUrl, setCoverUrl] = useState(
      initialColist ? initialColist.coverUrl || "" : forkOf?.coverUrl || "",
    );
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onFileChange = async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const imageDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
        setImageSrc(imageDataUrl);
        setCropModalOpen(true);
      }
    };

    const handleUploadCroppedImage = async () => {
      try {
        setIsUploadingCover(true);
        const croppedImageBlob = await getCroppedImg(
          imageSrc,
          croppedAreaPixels,
        );

        // Updated limit to match backend rules
        if (croppedImageBlob.size > 2 * 1024 * 1024) {
          setError(
            "Cropped image exceeds 2MB limit. Please choose a smaller image.",
          );
          setIsUploadingCover(false);
          setCropModalOpen(false);
          return;
        }

        const fileName = `cover_${createBlockId()}.jpg`;
        const activeUserId = currentUser?.uid || userData?.uid;

        if (!activeUserId) {
          throw new Error("Security Violation: Authentication context lost.");
        }

        const storageRef = ref(
          storage,
          `colist_covers/${activeUserId}/${fileName}`,
        );

        // MAANG STANDARD: Force browser to construct a native File object.
        // This guarantees strict MIME type headers are attached natively before Firebase payload wrapping.
        const nativeFile = new File([croppedImageBlob], fileName, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        const metadata = {
          contentType: "image/jpeg",
          cacheControl: "public,max-age=31536000",
        };

        await uploadBytes(storageRef, nativeFile, metadata);
        const downloadUrl = await getDownloadURL(storageRef);

        setCoverUrl(downloadUrl);
        setCropModalOpen(false);
      } catch (e) {
        console.error("Storage Pipeline Failure:", e);
        setError("Cover upload rejected by security firewall.");
      } finally {
        setIsUploadingCover(false);
      }
    };

    const [title, setTitle] = useState(
      initialColist
        ? initialColist.title
        : forkOf
          ? `${forkOf.title} (Fork)`
          : "",
    );
    const [subtext, setSubtext] = useState(
      initialColist ? initialColist.subtext || "" : forkOf?.subtext || "",
    );
    const [description, setDescription] = useState(
      initialColist ? initialColist.description || "" : "",
    );
    const [tags, setTags] = useState(
      initialColist ? initialColist.tags || [] : [],
    );
    const [tagInput, setTagInput] = useState("");

    const initialCoverIdx = initialColist
      ? Math.max(0, COVER_GRADIENTS.indexOf(initialColist.coverGradient))
      : 0;
    const [coverIdx, setCoverIdx] = useState(initialCoverIdx);
    const [textColor, setTextColor] = useState(
      initialColist
        ? initialColist.textColor || THEME_TEXT_COLORS[initialCoverIdx]
        : THEME_TEXT_COLORS[0],
    );
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const [showColorDropdown, setShowColorDropdown] = useState(false);
    const [colorMode, setColorMode] = useState("presets"); // "presets" | "custom"
    const [activeEditor, setActiveEditor] = useState(null);
    const [error, setError] = useState("");
    const [focusNextIdx, setFocusNextIdx] = useState(null);

    const initialBlocks =
      initialColist?.blocks?.length > 0
        ? initialColist.blocks
        : forkOf?.blocks?.length > 0
          ? forkOf.blocks
          : [
              {
                id: createBlockId(),
                type: "insight",
                content: "",
                title: "",
                description: "",
                url: "",
                language: "",
                author: "",
                youtubeId: "",
              },
            ];

    const [blocks, setBlocks] = useState(initialBlocks);

    const handleAdvancePage = useCallback((currentIdx, overflowJSON = null) => {
      const nextIdx = currentIdx + 1;

      setBlocks((prev) => {
        const isLastPage = currentIdx === prev.length - 1;
        const newBlock = {
          id: createBlockId(),
          type: "insight",
          _initialJSON: overflowJSON || null,
          content: "",
          title: "",
          description: "",
          url: "",
          language: "",
          author: "",
          youtubeId: "",
        };

        if (isLastPage) {
          return [...prev, newBlock];
        }

        const next = [...prev];
        if (overflowJSON && !next[nextIdx]?.content?.trim()) {
          next[nextIdx] = { ...next[nextIdx], _initialJSON: overflowJSON };
        }
        return next;
      });

      setFocusNextIdx(nextIdx);

      requestAnimationFrame(() => {
        const el = document.getElementById("editor-scroll-area");
        if (!el) return;
        const target = el.querySelector(`[data-slide-idx="${nextIdx}"]`);
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      });
    }, []);

    const handleBulkPaste = useCallback((startIdx, chunkNodeArrays) => {
      if (!chunkNodeArrays?.length) return;
      const finalIdx = startIdx + chunkNodeArrays.length - 1;

      setBlocks((prev) => {
        const next = [...prev];
        next[startIdx] = {
          ...next[startIdx],
          _initialJSON: { type: "doc", content: chunkNodeArrays[0] },
          content: "",
        };
        const newSlides = chunkNodeArrays.slice(1).map((nodeArr) => ({
          id: createBlockId(),
          type: "insight",
          _initialJSON: { type: "doc", content: nodeArr },
          content: "",
          title: "",
          description: "",
          url: "",
          language: "",
          author: "",
          youtubeId: "",
        }));
        next.splice(startIdx + 1, 0, ...newSlides);
        return next;
      });

      setFocusNextIdx(finalIdx);

      requestAnimationFrame(() => {
        const el = document.getElementById("editor-scroll-area");
        if (!el) return;
        const target = el.querySelector(`[data-slide-idx="${finalIdx}"]`);
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      });
    }, []);

    const validBlocks = useMemo(
      () =>
        blocks
          .filter(
            (b) =>
              b.type === "divider" ||
              b.content?.trim() ||
              b.url?.trim() ||
              b.title?.trim(),
          )
          .map((b) => {
            const cleanBlock = { ...b };
            Object.keys(cleanBlock).forEach((key) => {
              if (cleanBlock[key] === undefined) {
                cleanBlock[key] = null;
              }
            });
            return cleanBlock;
          }),
      [blocks],
    );

    const canPublish = title.trim().length >= 3 && validBlocks.length >= 2;

    const [saveState, setSaveState] = useState("saved");
    const [draftId, setDraftId] = useState(
      initialColist ? initialColist.id : null,
    );
    const isInitialRender = useRef(true);

    const isDraftEmptyAndNew = useCallback(() => {
      if (draftId) return false;
      if (title.trim() !== "") return false;
      if (subtext.trim() !== "") return false;
      if (description.trim() !== "") return false;
      if (tags.length > 0) return false;
      if (blocks.length > 1) return false;

      if (blocks.length === 1) {
        const b = blocks[0];
        if (
          b.title?.trim() ||
          b.url?.trim() ||
          b.youtubeId?.trim() ||
          b.author?.trim()
        )
          return false;
        if (
          b.content &&
          b.content.trim() !== "" &&
          b.content.trim() !== "<p></p>"
        )
          return false;
      }
      return true;
    }, [draftId, title, subtext, description, tags, blocks]);

    useEffect(() => {
      const handleBeforeUnload = (e) => {
        if (saveState !== "saved" && !isDraftEmptyAndNew()) {
          e.preventDefault();
          e.returnValue = "";
        }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () =>
        window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [saveState, isDraftEmptyAndNew]);

    const handleCloseClick = useCallback(() => {
      if (saveState !== "saved" && !isDraftEmptyAndNew()) {
        if (
          !window.confirm(
            "You have unsaved changes. Are you sure you want to exit?",
          )
        ) {
          return;
        }
      }
      onClose();
    }, [saveState, onClose, isDraftEmptyAndNew]);

    useEffect(() => {
      if (isInitialRender.current) {
        isInitialRender.current = false;
        return;
      }
      const timer = setTimeout(() => {
        setSaveState((prev) => (prev !== "unsaved" ? "unsaved" : prev));
      }, 0);
      return () => clearTimeout(timer);
    }, [
      title,
      subtext,
      description,
      tags,
      coverIdx,
      coverUrl,
      textColor,
      blocks,
    ]);

    const generateDraftSlug = useCallback((baseTitle) => {
      const base = baseTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45);
      const random6 = Math.floor(100000 + Math.random() * 900000).toString();
      return `${base || "draft"}-${random6}`;
    }, []);

    const performSave = useCallback(async () => {
      if (!title.trim() || title.trim().length < 3) return;

      setSaveState("saving");
      try {
        const finalTags = tags.slice(0, 5);
        const isInitialSave = !draftId;

        const currentSlug = isInitialSave
          ? generateDraftSlug(title.trim())
          : undefined;

        const isActuallyAdmin =
          userData?.role === "admin" ||
          String(userData?.tier).toUpperCase() === "ADMIN";

        const payload = {
          title: title.trim(),
          subtext: subtext.trim(),
          description: description.trim(),
          tags: finalTags,
          coverGradient: COVER_GRADIENTS[coverIdx],
          coverUrl: coverUrl || null,
          textColor,
          blocks: validBlocks,
          ...(isActuallyAdmin
            ? { verificationTier: "original", colistScore: 100 }
            : {}),
          updatedAt: serverTimestamp(),
        };

        if (isInitialSave) {
          payload.slug = currentSlug;
        }

        if (draftId) {
          const docRef = doc(db, "colists", draftId);
          updateDoc(docRef, payload).catch((err) =>
            console.warn("Background sync delayed:", err),
          );
        } else {
          payload.authorId = currentUser?.uid || userData?.uid;
          payload.authorUsername = userData.identity?.username || "operator";
          payload.authorName =
            `${userData.identity?.firstName || ""} ${userData.identity?.lastName || ""}`.trim() ||
            "Operator";
          payload.authorAvatar = userData.identity?.avatarUrl || null;
          payload.isPublic = false;
          payload.viewCount = 0;
          payload.saveCount = 0;
          payload.colistScore = 0;
          payload.colistScoreMilestone = 0;
          payload.createdAt = serverTimestamp();

          const newDocRef = doc(collection(db, "colists"));
          setDraftId(newDocRef.id);
          setDoc(newDocRef, payload).catch((err) =>
            console.warn("Background sync delayed:", err),
          );

          window.history.replaceState(
            window.history.state || { modal: "editor" },
            "",
            `/colists/${currentSlug}/unpublished`,
          );
        }

        setSaveState("saved");
      } catch (e) {
        console.error("Save failure:", e);
        setSaveState("unsaved");
      }
    }, [
      title,
      subtext,
      description,
      tags,
      coverIdx,
      coverUrl,
      textColor,
      validBlocks,
      draftId,
      userData,
      currentUser,
      generateDraftSlug,
    ]);

    useEffect(() => {
      if (saveState === "unsaved") {
        const timer = setTimeout(() => {
          if (title.trim().length >= 3) {
            performSave();
          }
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [saveState, performSave, title]);

    const addSlide = useCallback(() => {
      setBlocks((prev) => [
        ...prev,
        {
          id: createBlockId(),
          type: "insight",
          content: "",
          title: "",
          description: "",
          url: "",
          language: "",
          author: "",
          youtubeId: "",
        },
      ]);
      setTimeout(() => {
        const el = document.getElementById("editor-scroll-area");
        if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      }, 50);
    }, []);

    const updateBlock = useCallback(
      (idx, updated) =>
        setBlocks((prev) => prev.map((b, i) => (i === idx ? updated : b))),
      [],
    );
    const deleteBlock = useCallback(
      (idx) => setBlocks((prev) => prev.filter((_, i) => i !== idx)),
      [],
    );

    const moveBlock = useCallback((idx, dir) => {
      setBlocks((prev) => {
        const n = [...prev];
        if (idx + dir < 0 || idx + dir >= n.length) return n;
        [n[idx], n[idx + dir]] = [n[idx + dir], n[idx]];
        return n;
      });
    }, []);

    const handleTagChange = useCallback(
      (e) => {
        const val = e.target.value;
        if (val.endsWith(", ") || val.endsWith(",")) {
          const newTag = val.replace(/,\s*$/, "").trim();
          if (newTag && tags.length < 10 && !tags.includes(newTag))
            setTags((prev) => [...prev, newTag]);
          setTagInput("");
        } else setTagInput(val);
      },
      [tags, setTags, setTagInput],
    );

    const handlePublish = async () => {
      if (!canPublish) {
        setError(
          validBlocks.length < 2
            ? "Minimum 2 pages required (Cover + 1 Content)."
            : "Title must be at least 3 characters.",
        );
        return;
      }
      setSaveState("saving");
      setError("");
      try {
        const finalTags = tags.slice(0, 5);
        const isInitialSave = !draftId;
        const currentSlug = isInitialSave
          ? generateDraftSlug(title.trim())
          : undefined;

        const isAdmin =
          userData?.role === "admin" ||
          String(userData?.tier).toUpperCase() === "ADMIN";

        const payload = {
          title: title.trim(),
          subtext: subtext.trim(),
          description: description.trim(),
          tags: finalTags,
          coverGradient: COVER_GRADIENTS[coverIdx],
          coverUrl: coverUrl || null,
          textColor,
          blocks: validBlocks,
          isPublic: true,
          ...(isAdmin ? { verificationTier: "original" } : {}),
          updatedAt: serverTimestamp(),
        };

        if (isInitialSave) {
          payload.slug = currentSlug;
        }

        if (draftId) {
          const docRef = doc(db, "colists", draftId);
          updateDoc(docRef, payload).catch((err) =>
            console.warn("Background sync delayed:", err),
          );

          onPublish?.(currentSlug || "published");
        } else {
          payload.authorId = currentUser?.uid || userData?.uid;
          payload.authorUsername = userData.identity?.username || "operator";
          payload.authorName =
            `${userData.identity?.firstName || ""} ${userData.identity?.lastName || ""}`.trim() ||
            "Operator";
          payload.authorAvatar = userData.identity?.avatarUrl || null;
          payload.viewCount = 0;
          payload.saveCount = 0;
          payload.colistScore = 0;
          payload.colistScoreMilestone = 0;
          payload.createdAt = serverTimestamp();

          const newDocRef = doc(collection(db, "colists"));
          setDoc(newDocRef, payload).catch((err) =>
            console.warn("Background sync delayed:", err),
          );

          onPublish?.(currentSlug);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to publish. Please try again.");
        setSaveState("unsaved");
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: "3%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "3%" }}
        transition={{ type: "spring", damping: 32, stiffness: 220 }}
        className="fixed inset-0 z-[500] flex flex-col overflow-hidden bg-[#030303]"
        style={{ "--editor-text-color": textColor }}
        onClick={() => {
          setShowThemeDropdown(false);
          setShowColorDropdown(false);
        }}
      >
        <style>{`
          .colored-placeholder::placeholder {
            color: var(--editor-text-color) !important;
            opacity: 0.4 !important;
          }
          .tip-tap-container {
            font-family: var(--font-body), 'Poppins', sans-serif !important;
          }
          .tip-tap-container hr {
            border: none;
            border-top: 1px solid var(--editor-text-color) !important;
            opacity: 0.3 !important;
            margin: 2rem 0 !important;
          }
          .tip-tap-container div[data-youtube-video] {
            margin: 2rem 0 1rem 0 !important;
          }
          .tip-tap-container h1 { font-size: 2.2em !important; font-weight: 900 !important; line-height: 1.1 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
          .tip-tap-container h2 { font-size: 1.8em !important; font-weight: 800 !important; line-height: 1.2 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
          .tip-tap-container h3 { font-size: 1.4em !important; font-weight: 700 !important; line-height: 1.3 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
          .tip-tap-container ul { list-style-type: disc !important; padding-left: 1.5em !important; margin-bottom: 1em !important; }
          .tip-tap-container ol { list-style-type: decimal !important; padding-left: 1.5em !important; margin-bottom: 1em !important; }
          .tip-tap-container li { display: list-item !important; }
          .tip-tap-container blockquote { border-left: 3px solid var(--editor-text-color) !important; padding-left: 1rem !important; font-style: italic !important; opacity: 0.9 !important; margin: 1rem 0 !important; }
          .tip-tap-container p { margin-bottom: 0.5em !important; min-height: 1.5em !important; }
        `}</style>

        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-8 py-4 bg-black/40 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCloseClick}
              title="Close Editor"
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            >
              <X size={18} />
            </button>
            {forkOf && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <GitFork size={12} className="text-[#D4AF78]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF78]">
                  Fork of @{forkOf.authorUsername}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 mr-2">
              <span>Meta</span>
              <ArrowRight size={10} />
              <span>
                {validBlocks.length} Page{validBlocks.length !== 1 && "s"}
              </span>
            </div>

            <button
              title={
                saveState === "saved"
                  ? "Saved to Cloud"
                  : saveState === "saving"
                    ? "Saving..."
                    : "Unsaved Changes (Click to save)"
              }
              onClick={() => saveState === "unsaved" && performSave()}
              className="p-2 rounded-full transition-colors text-white/50 hover:text-white flex items-center justify-center"
            >
              {saveState === "saving" && (
                <Loader2 size={16} className="animate-spin text-[#D4AF78]" />
              )}
              {saveState === "saved" && (
                <Cloud size={16} className="text-[#4ADE80]" />
              )}
              {saveState === "unsaved" && <Save size={16} />}
            </button>

            {error && (
              <p className="text-[10px] text-red-400 font-bold hidden md:block max-w-[150px] truncate">
                {error}
              </p>
            )}
            <motion.button
              whileHover={canPublish ? { scale: 1.04 } : {}}
              whileTap={canPublish ? { scale: 0.96 } : {}}
              onClick={handlePublish}
              disabled={saveState === "saving" || !canPublish}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest disabled:opacity-30 transition-opacity"
              style={{
                background: "linear-gradient(135deg,#8B7240,#D4AF78)",
                color: "#000",
              }}
            >
              <Globe size={14} /> Publish
            </motion.button>
          </div>
        </div>

        <div
          id="editor-scroll-area"
          className="flex-1 w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar snap-x snap-mandatory flex items-center px-[5vw] md:px-[15vw] pt-20 pb-8 gap-4 md:gap-8"
        >
          <div
            className="w-[85vw] max-w-[400px] h-[75vh] min-h-[500px] shrink-0 snap-center rounded-[2.5rem] p-6 md:p-8 flex flex-col relative overflow-visible shadow-2xl transition-all border border-white/10"
            style={{ background: COVER_GRADIENTS[coverIdx] }}
            onClick={() => {
              setShowThemeDropdown(false);
              setShowColorDropdown(false);
            }}
          >
            <AnimatePresence>
              {cropModalOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-10"
                >
                  <div className="w-full max-w-4xl bg-[#0A0A0A] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">
                          Crop Cover Image
                        </h3>
                        <p className="text-[10px] text-white/40 mt-1">
                          Aspect Ratio Fixed at 16:9 (Output: 1280x720px) • Max
                          1MB
                        </p>
                      </div>
                      <button
                        onClick={() => setCropModalOpen(false)}
                        className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="relative w-full h-[50vh] bg-[#111]">
                      <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1280 / 720}
                        onCropChange={setCrop}
                        onCropComplete={(p, px) => setCroppedAreaPixels(px)}
                        onZoomChange={setZoom}
                      />
                    </div>
                    <div className="p-6 bg-[#0A0A0A] flex items-center justify-between">
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(e.target.value)}
                        className="w-1/3 accent-[#D4AF78]"
                      />
                      <button
                        onClick={handleUploadCroppedImage}
                        disabled={isUploadingCover}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
                        style={{
                          background: "linear-gradient(135deg,#8B7240,#D4AF78)",
                          color: "#000",
                        }}
                      >
                        {isUploadingCover ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />{" "}
                            Processing...
                          </>
                        ) : (
                          <>
                            <Crop size={14} /> Confirm & Upload
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mb-4 relative z-[60]">
              <span
                className="text-[10px] font-black font-mono tracking-widest"
                style={{ color: textColor, opacity: 0.6 }}
              >
                COVER & META
              </span>

              <div className="flex items-center gap-2 relative">
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    title="Canvas Theme"
                    onClick={() => {
                      setShowThemeDropdown(!showThemeDropdown);
                      setShowColorDropdown(false);
                    }}
                    className="w-6 h-6 rounded-full border-2 border-white shadow-xl hover:scale-110 transition-transform"
                    style={{ background: COVER_GRADIENTS[coverIdx] }}
                  />
                  <AnimatePresence>
                    {showThemeDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-8 right-0 bg-[#111] border border-white/10 p-3 rounded-2xl shadow-2xl w-[200px] z-[100]"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-3">
                          Themes
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {COVER_GRADIENTS.map((g, i) => (
                            <button
                              key={i}
                              title={`Theme ${i + 1}`}
                              onClick={() => {
                                setCoverIdx(i);
                                setTextColor(THEME_TEXT_COLORS[i]);
                                setShowThemeDropdown(false);
                              }}
                              className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                              style={{
                                background: g,
                                borderColor:
                                  coverIdx === i ? "#fff" : "transparent",
                              }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    title="Text Color"
                    onClick={() => {
                      setShowColorDropdown(!showColorDropdown);
                      setShowThemeDropdown(false);
                    }}
                    className="w-6 h-6 rounded-full border-2 border-white/20 shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
                    style={{ background: textColor }}
                  >
                    <span
                      className="text-[10px] font-bold mix-blend-difference"
                      style={{
                        color: textColor === "#ffffff" ? "#000" : "#fff",
                      }}
                    >
                      A
                    </span>
                  </button>
                  <AnimatePresence>
                    {showColorDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-8 right-0 bg-[#111] border border-white/10 p-3 rounded-2xl shadow-2xl w-[240px] z-[100] overflow-hidden"
                      >
                        <AnimatePresence mode="wait">
                          {colorMode === "presets" ? (
                            <motion.div
                              key="presets"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ duration: 0.15 }}
                            >
                              <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-3">
                                Default Colors
                              </p>
                              <div className="flex flex-wrap gap-2.5">
                                <button
                                  title="Add Custom Color"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setColorMode("custom");
                                  }}
                                  className="w-[26px] h-[26px] rounded-full border border-white/10 shadow-md flex items-center justify-center hover:scale-110 transition-transform overflow-hidden relative"
                                >
                                  <div
                                    className="absolute inset-0"
                                    style={{
                                      background:
                                        "conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                                    }}
                                  />
                                  <div className="relative z-10 w-full h-full bg-black/20 flex items-center justify-center backdrop-blur-[1px]">
                                    <Plus
                                      size={14}
                                      color="white"
                                      className="drop-shadow-md"
                                    />
                                  </div>
                                </button>
                                {PRESET_COLORS.map((c) => (
                                  <button
                                    key={c}
                                    title={c}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTextColor(c);
                                    }}
                                    className="w-[26px] h-[26px] rounded-full border-2 hover:scale-110 transition-all shadow-sm"
                                    style={{
                                      background: c,
                                      borderColor:
                                        textColor.toLowerCase() ===
                                        c.toLowerCase()
                                          ? "#BFA264"
                                          : "rgba(255,255,255,0.15)",
                                    }}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="custom"
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.15 }}
                              className="flex flex-col gap-3"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setColorMode("presets");
                                  }}
                                  className="p-1 rounded-md hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                                >
                                  <ArrowLeft size={12} />
                                </button>
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">
                                  Custom Color
                                </p>
                              </div>

                              <div
                                className="custom-color-picker-wrapper w-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <HexColorPicker
                                  color={textColor}
                                  onChange={setTextColor}
                                  style={{ width: "100%", height: "140px" }}
                                />
                              </div>

                              <div
                                className="flex items-center gap-2 bg-black/50 p-2 rounded-lg border border-white/5 mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div
                                  className="w-5 h-5 rounded shadow-inner shrink-0"
                                  style={{
                                    background: textColor,
                                    border: "1px solid rgba(255,255,255,0.2)",
                                  }}
                                />
                                <span className="text-[#888] text-xs font-mono">
                                  #
                                </span>
                                <input
                                  type="text"
                                  title="Hex Code"
                                  value={textColor.replace("#", "")}
                                  onChange={(e) =>
                                    setTextColor(`#${e.target.value}`)
                                  }
                                  className="flex-1 bg-transparent text-xs font-mono text-white outline-none uppercase"
                                  maxLength={6}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <label
              className={cn(
                "w-full relative z-[60] flex flex-col items-center justify-center mb-6 rounded-xl transition-all cursor-pointer group overflow-hidden shrink-0",
                coverUrl
                  ? "h-32 md:h-40 border-none shadow-2xl"
                  : "py-4 border-2 border-dashed hover:bg-black/40",
              )}
              style={
                !coverUrl
                  ? {
                      borderColor: "rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.2)",
                      color: textColor,
                    }
                  : {}
              }
            >
              {coverUrl ? (
                <>
                  <img
                    src={coverUrl}
                    alt="Cover Banner"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1 text-white">
                      <ImageIcon size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Change Cover Image
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <ImageIcon size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Upload Cover Image
                    </span>
                  </div>
                  <span className="text-[8px] font-mono opacity-40">
                    1280 x 720px (Max 1MB)
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
            </label>

            <textarea
              value={title}
              onChange={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
                setTitle(e.target.value);
              }}
              placeholder="Title..."
              className="colored-placeholder font-display font-black text-4xl leading-tight resize-none overflow-hidden bg-transparent border-none outline-none mb-2"
              style={{ color: textColor }}
              rows={1}
              maxLength={70}
            />

            <input
              value={subtext}
              onChange={(e) => setSubtext(e.target.value)}
              placeholder="Subtext..."
              className="colored-placeholder font-display font-bold text-lg md:text-xl bg-transparent border-none outline-none mb-6 w-full"
              style={{ color: textColor, opacity: 0.8 }}
              maxLength={20}
            />

            <textarea
              value={description}
              onChange={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
                setDescription(e.target.value);
              }}
              placeholder="Brief description..."
              className="colored-placeholder text-base md:text-lg leading-relaxed resize-none overflow-hidden bg-transparent border-none outline-none w-full mb-6"
              style={{ color: textColor, opacity: 0.9 }}
              maxLength={200}
              rows={2}
            />

            <div className="mt-auto space-y-4 md:space-y-6">
              <div className="bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="bg-white/10 text-white border border-white/10 rounded-full px-2 py-1 text-[10px] flex items-center gap-1 font-black tracking-widest uppercase"
                    >
                      {t}
                      <X
                        size={10}
                        className="cursor-pointer hover:text-red-400"
                        onClick={() =>
                          setTags((prev) => prev.filter((tag) => tag !== t))
                        }
                      />
                    </span>
                  ))}
                </div>
                <input
                  value={tagInput}
                  onChange={handleTagChange}
                  placeholder={
                    tags.length < 10
                      ? "Add tag (type ',')"
                      : "Max 10 tags reached"
                  }
                  disabled={tags.length >= 10}
                  className="text-xs bg-transparent border-none outline-none text-white placeholder-white/30 w-full font-mono"
                />
              </div>
            </div>
          </div>

          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[150]">
            <EditorToolbar editor={activeEditor} />
          </div>

          <AnimatePresence>
            {blocks.map((block, idx) => (
              <motion.div
                key={block.id}
                layout
                data-slide-idx={idx}
                initial={{ opacity: 0, scale: 0.88, x: 60 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  transition: { type: "spring", damping: 24, stiffness: 220 },
                }}
                exit={{
                  opacity: 0,
                  y: -72,
                  scale: 0.82,
                  filter: "blur(8px)",
                  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
                }}
                className="w-[85vw] max-w-[400px] h-[75vh] min-h-[500px] shrink-0 snap-center rounded-[2.5rem] p-6 md:p-8 flex flex-col relative shadow-2xl border border-white/10"
                style={{ background: COVER_GRADIENTS[coverIdx] }}
              >
                <TipTapPageEditor
                  block={block}
                  idx={idx}
                  total={blocks.length}
                  onUpdate={updateBlock}
                  onDelete={deleteBlock}
                  onMove={moveBlock}
                  textColor={textColor}
                  onAdvancePage={handleAdvancePage}
                  onBulkPaste={handleBulkPaste}
                  setActiveEditor={setActiveEditor}
                  shouldFocus={focusNextIdx === idx}
                  onFocusConsumed={() => setFocusNextIdx(null)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={addSlide}
            className="w-[85vw] max-w-[400px] h-[75vh] min-h-[500px] shrink-0 snap-center rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer group transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "2px dashed rgba(255,255,255,0.1)",
            }}
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 group-hover:scale-110 transition-all">
              <Plus
                size={28}
                className="text-white/40 group-hover:text-white transition-colors"
              />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-white/30 group-hover:text-white/80 transition-colors">
              Add New Page
            </span>
          </motion.div>

          <div className="shrink-0 w-[5vw] md:w-[15vw] h-1" />
        </div>
      </motion.div>
    );
  },
);

export default ColistEditor;
