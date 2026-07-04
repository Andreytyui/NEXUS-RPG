import React from "react";

/* Avisos obrigatórios da Licença da Comunidade de Ordem Paranormal
 * (https://ordemparanormal.com.br/licenca — spec 0003).
 * O texto legal é fixo em pt-BR: a licença exige a frase exata, independente do locale. */
export const TEXTO_NAO_OFICIAL =
  "Este é um conteúdo não oficial, publicado sob a Licença da Comunidade de Ordem Paranormal.";
export const TEXTO_IA = "Contém material gerado por inteligência artificial.";

const SELO_SRC = process.env.PUBLIC_URL + "/selo-conteudo-nao-oficial.png";

/* variant="footer": selo pequeno + texto, para o rodapé global.
 * variant="ficha": selo com largura ≥10% do container (mín. 48px), exigência da licença para capas. */
export default function LicencaOP({ variant = "footer", style }) {
  const ficha = variant === "ficha";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ficha ? 12 : 8, opacity: 1, ...style }}>
      <img
        src={SELO_SRC}
        alt="Selo Conteúdo Não Oficial — Licença da Comunidade de Ordem Paranormal"
        style={ficha
          ? { width: "10%", minWidth: 48, maxWidth: 120, height: "auto", flexShrink: 0 }
          : { width: 26, height: "auto", flexShrink: 0 }}
      />
      <span style={{
        fontSize: ficha ? 11 : 9, lineHeight: 1.45, color: "var(--muted, #9a93a5)",
        fontFamily: ficha ? "var(--font-data,'Share Tech Mono',monospace)" : "inherit",
      }}>
        {TEXTO_NAO_OFICIAL}
      </span>
    </div>
  );
}
