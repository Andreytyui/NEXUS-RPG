const CORES = {
  conhecimento: "#c9a84c",
  energia: "#8844cc",
  morte: "#c8c8c8",
  sangue: "#cc0000",
  medo: "#4466cc",
  varia: "#888888",
};
const NOMES = {
  conhecimento: "Conhecimento", energia: "Energia", morte: "Morte",
  sangue: "Sangue", medo: "Medo", varia: "Varia",
};
const SIMBOLOS = {
  conhecimento: "△", energia: "◇", morte: "☽",
  sangue: "✚", medo: "◈", varia: "~",
};

export default function ElementoBadge({ elemento, style }) {
  const color = CORES[elemento] || "#888";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11,
      padding: "2px 8px", borderRadius: 4,
      background: `${color}22`, border: `1px solid ${color}66`, color,
      fontFamily: "var(--font-data,'Share Tech Mono',monospace)",
      letterSpacing: "0.04em", whiteSpace: "nowrap",
      ...style,
    }}>
      {SIMBOLOS[elemento] || "•"} {NOMES[elemento] || elemento}
    </span>
  );
}

export { CORES as ELEMENTO_CORES, NOMES as ELEMENTO_NOMES, SIMBOLOS as ELEMENTO_SIMBOLOS };
