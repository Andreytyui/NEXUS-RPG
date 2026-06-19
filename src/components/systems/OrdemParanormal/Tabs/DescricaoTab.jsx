import RichTextEditor from "./shared/RichTextEditor";
import { tLabel } from "./shared/modalStyles";

const SECOES = [
  { key: "anotacoes", label: "Anotações", hint: "Idade, sonhos, detalhes diversos…" },
  { key: "aparencia", label: "Aparência", hint: "Como o agente se apresenta fisicamente…" },
  { key: "personalidade", label: "Personalidade", hint: "Traços, maneirismos, valores…" },
  { key: "historico", label: "Histórico", hint: "Passado, origem, eventos marcantes…" },
  { key: "objetivo", label: "Objetivo", hint: "Metas, motivações, o que busca…" },
];

const secLabel = {
  ...tLabel, display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
};

export default function DescricaoTab({ descricao, setDescricao, isMaster }) {
  const d = descricao || {};
  const set = (key, val) => setDescricao((p) => ({ ...(p || {}), [key]: val }));

  const secoes = isMaster
    ? [...SECOES, { key: "notas_mestre", label: "Notas do Mestre", hint: "Visível apenas ao Mestre…", gm: true }]
    : SECOES;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {secoes.map((s) => (
        <div key={s.key}>
          <div style={{ ...secLabel, color: s.gm ? "var(--danger-text,#d85a5a)" : "var(--el-accent)" }}>
            <span style={{ whiteSpace: "nowrap" }}>{s.label}{s.gm && " 🔒"}</span>
            <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${s.gm ? "var(--danger-text,#d85a5a)" : "var(--el-border)"}, transparent)` }} />
          </div>
          <RichTextEditor value={d[s.key]} onChange={(v) => set(s.key, v)} placeholder={s.hint} minHeight={s.key === "anotacoes" || s.key === "historico" ? 110 : 80} />
        </div>
      ))}
    </div>
  );
}
