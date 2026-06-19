import { useState } from "react";
import { CLASS_TRAILS, TRAIL_ABILITIES, CLASS_BASE_ABILITIES, CLASSES_OP } from "../rules";
import { tCardTitle, tBody, tStat, tLabel, tEmpty, tSubtext, btnGhost } from "./shared/modalStyles";

/* ── NEX Progress Bar ── */
function NexBar({ nex }) {
  const pct = (nex / 99) * 100;
  const lvl = nex < 25 ? "Iniciante" : nex < 50 ? "Veterano" : nex < 75 ? "Especialista" : nex < 99 ? "Lendário" : "Transcendente";
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 6 }}>
        <span style={{ ...tLabel, fontSize: 12 }}>NEX ATUAL</span>
        <span style={{ ...tStat, fontSize: 20, color:"var(--el-accent)" }}>{nex}%</span>
      </div>
      <div style={{ height: 8, background:"rgba(255,255,255,0.06)", borderRadius: 4, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:"var(--el-accent)", borderRadius: 4, transition:"width 0.5s ease", boxShadow:"0 0 8px var(--el-glow)" }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop: 4 }}>
        <span style={{ ...tSubtext, fontSize: 10 }}>1%</span>
        <span style={{ ...tSubtext, fontSize: 11, color:"var(--el-accent)" }}>{lvl}</span>
        <span style={{ ...tSubtext, fontSize: 10 }}>99%</span>
      </div>
    </div>
  );
}

/* ── Class Badge ── */
function ClassBadge({ classe }) {
  if (!classe) return null;
  const meta = CLASSES_OP.find(c => c.id === (classe.id || classe)) || {};
  return (
    <div style={{ display:"flex", alignItems:"center", gap: 10, padding:"12px 16px", background:"rgba(255,255,255,0.03)", border:"1px solid var(--el-border)", borderRadius: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 28 }}>{meta.icon || "⚡"}</span>
      <div>
        <div style={{ ...tCardTitle, fontSize: 15 }}>{classe.name || meta.name || "Classe"}</div>
        <div style={{ ...tSubtext }}>{meta.bonus || ""}</div>
      </div>
    </div>
  );
}

/* ── Trilha Selector ── */
function TrilhaSelector({ classe, trilha, setTrilha, nex }) {
  const classeId = classe?.id || classe;
  const trails = CLASS_TRAILS[classeId] || [];
  if (!classeId || trails.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...tLabel, marginBottom: 8 }}>Trilha de {classe?.name || classeId}</div>
      <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
        {trails.map(t => {
          const active = (trilha?.id || trilha) === t.id;
          return (
            <button key={t.id} onClick={() => setTrilha(t)}
              style={{
                ...tLabel, fontSize: 11, padding:"8px 16px", borderRadius: 20, cursor:"pointer",
                background: active ? "var(--el-accent)" : "rgba(255,255,255,0.04)",
                color: active ? "#0a0a0f" : "var(--muted2)",
                border: `1px solid ${active ? "var(--el-accent)" : "var(--border)"}`,
                transition:"all 0.2s",
              }}>
              {t.name}
            </button>
          );
        })}
      </div>
      {nex < 10 && (
        <div style={{ ...tSubtext, marginTop: 6, color:"rgba(201,168,76,0.5)" }}>Disponível ao atingir NEX 10%</div>
      )}
    </div>
  );
}

/* ── Trail Power Card ── */
function TrailPowerCard({ nexReq, ability, unlocked, onAdd }) {
  return (
    <div style={{
      padding:"12px 14px", borderRadius: 8, marginBottom: 8,
      background: unlocked ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${unlocked ? "var(--el-border)" : "rgba(255,255,255,0.06)"}`,
      opacity: unlocked ? 1 : 0.45,
      transition:"all 0.2s",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display:"flex", alignItems:"center", gap: 8, marginBottom: 4 }}>
            <span style={{ ...tStat, fontSize: 10, background:"rgba(201,168,76,0.12)", padding:"2px 6px", borderRadius: 3 }}>NEX {nexReq}%</span>
            {ability.cost && ability.cost !== "—" && (
              <span style={{ ...tStat, fontSize: 10, background:"rgba(99,160,240,0.12)", color:"#63a0f0", padding:"2px 6px", borderRadius: 3 }}>{ability.cost}</span>
            )}
            {unlocked && <span style={{ fontSize: 10, color:"#43a047" }}>✓ Desbloqueado</span>}
          </div>
          <div style={{ ...tCardTitle, fontSize: 13, marginBottom: 4 }}>{ability.name}</div>
          <div style={{ ...tBody, fontSize: 12, lineHeight: 1.55 }}>{ability.desc}</div>
        </div>
        {unlocked && onAdd && (
          <button onClick={onAdd} style={{ ...btnGhost, fontSize: 10, padding:"4px 10px", whiteSpace:"nowrap", flexShrink: 0 }}>+ Hab.</button>
        )}
      </div>
    </div>
  );
}

/* ── Base Ability Row ── */
function BaseAbilityRow({ entry, unlocked }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      padding:"10px 14px", borderRadius: 6, marginBottom: 6, cursor:"pointer",
      background: unlocked ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.01)",
      border: `1px solid ${unlocked ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}`,
      opacity: unlocked ? 1 : 0.4,
      transition:"all 0.2s",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
        <span style={{ ...tStat, fontSize: 10, minWidth: 46, textAlign:"center", background: unlocked ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)", padding:"2px 6px", borderRadius: 3 }}>
          NEX {entry.nex}%
        </span>
        <span style={{ ...tCardTitle, fontSize: 13, flex: 1 }}>{entry.name}</span>
        {entry.cost && entry.cost !== "—" && (
          <span style={{ ...tStat, fontSize: 10, color:"#63a0f0" }}>{entry.cost}</span>
        )}
        <span style={{ fontSize: 10, color:"var(--muted2)" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ ...tBody, fontSize: 12, marginTop: 8, paddingTop: 8, borderTop:"1px solid rgba(255,255,255,0.06)", lineHeight: 1.55 }}>
          {entry.desc}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
 *  MAIN TAB
 * ══════════════════════════════════════════════════════════ */
export default function ProgressaoTab({ nex, classe, origem, trilha, setTrilha, setHabilidades, onUpdate }) {
  const [section, setSection] = useState("base");

  const classeId = classe?.id || classe;
  const trilhaId = trilha?.id || trilha;
  const baseAbilities = CLASS_BASE_ABILITIES[classeId] || [];
  const trailList = CLASS_TRAILS[classeId] || [];
  const selectedTrail = trailList.find(t => t.id === trilhaId) || null;
  const trailPowers = selectedTrail ? (TRAIL_ABILITIES[trilhaId] || {}) : {};

  const handleAddToHabilidades = (nome, desc, cost) => {
    setHabilidades(prev => [...(prev || []), {
      id: Date.now() + Math.random(),
      nome,
      descricao: cost && cost !== "—" ? `<b>Custo:</b> ${cost}<br><br>${desc}` : desc,
      dados: "",
      imagem_url: "",
    }]);
  };

  const SECTIONS = [
    { id:"base",   label:"Progressão Base" },
    { id:"trilha", label:"Trilha" },
    { id:"origem", label:"Origem" },
  ];

  return (
    <div style={{ padding:"4px 0" }}>
      {/* NEX bar */}
      <NexBar nex={nex} />

      {/* Class */}
      <ClassBadge classe={classe} />

      {/* Trilha selector */}
      <TrilhaSelector classe={classe} trilha={trilha} setTrilha={setTrilha} nex={nex} />

      {/* Sub-nav */}
      <div style={{ display:"flex", gap: 4, marginBottom: 16, borderBottom:"1px solid var(--border2)", paddingBottom: 10 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            ...tLabel, fontSize: 10, padding:"6px 14px", borderRadius: 4, cursor:"pointer",
            background: section === s.id ? "var(--el-accent)" : "transparent",
            color: section === s.id ? "#0a0a0f" : "var(--muted2)",
            border: `1px solid ${section === s.id ? "var(--el-accent)" : "var(--border)"}`,
          }}>{s.label}</button>
        ))}
      </div>

      {/* ── Progressão Base ── */}
      {section === "base" && (
        <div>
          {!classeId ? (
            <div style={{ ...tEmpty, textAlign:"center", padding: 40 }}>Selecione uma classe para ver a progressão base.</div>
          ) : (
            <>
              <div style={{ ...tSubtext, marginBottom: 12 }}>
                Habilidades base da classe <b style={{ color:"var(--el-accent)" }}>{classe?.name || classeId}</b>. As marcadas em ouro já foram desbloqueadas.
              </div>
              {baseAbilities.map((entry, i) => (
                <BaseAbilityRow key={i} entry={entry} unlocked={nex >= entry.nex} />
              ))}
              {baseAbilities.length === 0 && (
                <div style={{ ...tEmpty, textAlign:"center", padding: 40 }}>Nenhuma habilidade base encontrada.</div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Trilha ── */}
      {section === "trilha" && (
        <div>
          {!selectedTrail ? (
            <div style={{ ...tEmpty, textAlign:"center", padding: 40 }}>
              {nex < 10 ? "Trilhas desbloqueadas a partir de NEX 10%." : "Selecione uma trilha acima para ver seus poderes."}
            </div>
          ) : (
            <>
              <div style={{ ...tStat, fontSize: 11, marginBottom: 12, color:"var(--el-accent)" }}>
                ✦ TRILHA: {selectedTrail.name.toUpperCase()}
              </div>
              {[10,40,65,99].map((nexReq, i) => {
                const ab = trailPowers[nexReq];
                if (!ab) return null;
                return (
                  <TrailPowerCard
                    key={nexReq}
                    nexReq={nexReq}
                    ability={ab}
                    unlocked={nex >= nexReq}
                    onAdd={() => handleAddToHabilidades(ab.name, ab.desc, ab.cost)}
                  />
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── Origem ── */}
      {section === "origem" && (
        <div>
          {!origem ? (
            <div style={{ ...tEmpty, textAlign:"center", padding: 40 }}>Nenhuma origem registrada nesta ficha.</div>
          ) : (
            <div style={{ padding:"16px 18px", background:"rgba(201,168,76,0.04)", border:"1px solid var(--el-border)", borderRadius: 8 }}>
              <div style={{ ...tStat, fontSize: 11, marginBottom: 4, color:"var(--el-accent)" }}>✦ ORIGEM</div>
              <div style={{ ...tCardTitle, fontSize: 15, marginBottom: 8 }}>{origem.name || origem}</div>
              {origem.desc && <div style={{ ...tBody, fontSize: 13, lineHeight: 1.65 }}>{origem.desc}</div>}
              {origem.pericias && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ ...tLabel, fontSize: 10, marginBottom: 4 }}>Perícias de Origem</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap: 6 }}>
                    {(Array.isArray(origem.pericias) ? origem.pericias : [origem.pericias]).map((p, i) => (
                      <span key={i} style={{ ...tStat, fontSize: 11, background:"rgba(255,255,255,0.06)", padding:"3px 8px", borderRadius: 4 }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {origem.poder && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ ...tLabel, fontSize: 10, marginBottom: 6 }}>Poder de Origem</div>
                  <div style={{ padding:"10px 14px", background:"rgba(255,255,255,0.03)", borderRadius: 6, border:"1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ ...tCardTitle, fontSize: 13, marginBottom: 4 }}>{origem.poder.name || "Poder"}</div>
                    <div style={{ ...tBody, fontSize: 12, lineHeight: 1.55 }}>{origem.poder.desc || ""}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Next milestone hint */}
      {classeId && section === "base" && (
        <div style={{ marginTop: 16, padding:"10px 14px", background:"rgba(255,255,255,0.02)", borderRadius: 6, border:"1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ ...tLabel, fontSize: 10, marginBottom: 4 }}>Próximo Desbloqueio</div>
          {(() => {
            const next = baseAbilities.find(e => e.nex > nex);
            if (!next) return <div style={{ ...tSubtext }}>Você atingiu o máximo da classe!</div>;
            return (
              <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
                <span style={{ ...tStat, fontSize: 10, background:"rgba(255,255,255,0.06)", padding:"2px 6px", borderRadius: 3 }}>NEX {next.nex}%</span>
                <span style={{ ...tSubtext }}>{next.name}</span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
