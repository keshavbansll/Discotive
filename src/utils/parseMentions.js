// AST-based mention/hashtag parser — runs once at post-creation time only
// NOT during render cycles
const SEGMENT_RE = /(@[\w]+|#[\w]+)/g;

export const parseContentToAST = (rawText) => {
  if (!rawText || typeof rawText !== "string") return [];
  const segments = [];
  let lastIndex = 0;
  let match;
  const re = new RegExp(SEGMENT_RE.source, "g");

  while ((match = re.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: rawText.slice(lastIndex, match.index),
      });
    }
    const token = match[0];
    if (token.startsWith("@")) {
      segments.push({ type: "mention", value: token, handle: token.slice(1) });
    } else {
      segments.push({ type: "hashtag", value: token, tag: token.slice(1) });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < rawText.length) {
    segments.push({ type: "text", value: rawText.slice(lastIndex) });
  }
  return segments;
};

// Render pre-parsed AST to React nodes — O(n) no regex
export const renderAST = (ast, navigate) => {
  if (!Array.isArray(ast)) return ast;
  return ast.map((seg, i) => {
    if (seg.type === "mention") {
      return (
        <span
          key={`mention-${i}`}
          className="text-[var(--gold-1)] font-semibold cursor-pointer hover:text-[var(--gold-2)] transition-colors duration-200"
          onClick={(e) => {
            e.stopPropagation(); // CRITICAL: Prevents triggering the parent Post Card click
            navigate?.(`/@${seg.handle}`);
          }}
        >
          {seg.value}
        </span>
      );
    }
    if (seg.type === "hashtag") {
      return (
        <span
          key={`hashtag-${i}`}
          className="text-sky-400 cursor-pointer hover:text-sky-300 transition-colors duration-200 font-medium"
          onClick={(e) => {
            e.stopPropagation(); // CRITICAL: Prevents triggering the parent Post Card click
            navigate?.(`/app/connective?tag=${seg.tag}`);
          }}
        >
          {seg.value}
        </span>
      );
    }
    return <span key={`text-${i}`}>{seg.value}</span>;
  });
};
