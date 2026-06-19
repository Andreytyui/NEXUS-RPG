import { useRef, useEffect, useCallback } from "react";

/* lightweight contentEditable rich-text editor
   bold → var(--el-accent) via CSS injected in ordemStyles
   italic → off-white italic
   underline → underline in element color */
export default function RichTextEditor({ value, onChange, placeholder, minHeight = 80 }) {
  const ref = useRef(null);
  const isComposing = useRef(false);

  // seed content on mount only (avoids cursor-jump on every keystroke)
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || "";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exec = useCallback((cmd) => {
    document.execCommand(cmd, false, null);
    ref.current?.focus();
  }, []);

  const handleInput = () => {
    if (!isComposing.current) onChange?.(ref.current?.innerHTML || "");
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 3, overflow: "hidden" }}>
      {/* toolbar */}
      <div style={{ display: "flex", gap: 3, padding: "4px 6px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid var(--border)" }}>
        {[
          { lbl: "B", cmd: "bold", style: { fontWeight: 700 } },
          { lbl: "I", cmd: "italic", style: { fontStyle: "italic" } },
          { lbl: "U", cmd: "underline", style: { textDecoration: "underline" } },
        ].map(({ lbl, cmd, style }) => (
          <button key={cmd} onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
            title={cmd} aria-label={cmd}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 2, color: "var(--muted2)", padding: "1px 8px", cursor: "pointer", fontSize: 12, lineHeight: 1.6, ...style }}>
            {lbl}
          </button>
        ))}
      </div>
      {/* editor */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        onBlur={() => onChange?.(ref.current?.innerHTML || "")}
        data-placeholder={placeholder}
        className="rte-area"
        style={{ minHeight, padding: "8px 10px", fontFamily: "var(--font-body,'IM Fell English',serif)", fontSize: 14, color: "#e8e4d9", background: "rgba(0,0,0,0.3)", outline: "none", lineHeight: 1.7 }}
      />
    </div>
  );
}
