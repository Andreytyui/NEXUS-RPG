import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import LicencaOP, { TEXTO_NAO_OFICIAL, TEXTO_IA } from "../LicencaOP";

// AC-1/AC-2 (spec 0003): texto obrigatório exato + selo presentes.
test("exibe o texto obrigatório da licença e o selo", () => {
  render(<LicencaOP />);
  expect(screen.getByText(TEXTO_NAO_OFICIAL)).toBeInTheDocument();
  const selo = screen.getByRole("img", { name: /conteúdo não oficial/i });
  expect(selo).toHaveAttribute("src", expect.stringContaining("selo-conteudo-nao-oficial.png"));
});

// AC-2: na variante ficha o selo tem largura 10% com piso de 48px.
test("variante ficha aplica largura mínima exigida pela licença", () => {
  render(<LicencaOP variant="ficha" />);
  const selo = screen.getByRole("img");
  expect(selo.style.width).toBe("10%");
  expect(selo.style.minWidth).toBe("48px");
});

// AC-4: o texto de IA exportado é o exigido pela licença.
test("texto de IA é a frase exata da licença", () => {
  expect(TEXTO_IA).toBe("Contém material gerado por inteligência artificial.");
});
