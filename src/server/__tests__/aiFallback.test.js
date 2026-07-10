const { PROVIDER_CHAIN, shouldFallback, buildRequestBody } = require("../aiFallback");

describe("PROVIDER_CHAIN (AC-7)", () => {
  it("has 2 elos with all required fields", () => {
    expect(PROVIDER_CHAIN).toHaveLength(2);
    PROVIDER_CHAIN.forEach((p) => {
      expect(typeof p.id).toBe("string");
      expect(typeof p.url).toBe("string");
      expect(typeof p.keyEnv).toBe("string");
      expect(typeof p.model).toBe("string");
      expect(typeof p.extraParams).toBe("object");
      expect(p.timeoutMs).toBeGreaterThan(0);
    });
  });

  it("has unique ids and unique keyEnv per elo", () => {
    const ids = PROVIDER_CHAIN.map((p) => p.id);
    const keyEnvs = PROVIDER_CHAIN.map((p) => p.keyEnv);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(keyEnvs).size).toBe(keyEnvs.length);
  });

  it("Groq is the first elo (primário, já em produção)", () => {
    expect(PROVIDER_CHAIN[0].id).toBe("groq");
    expect(PROVIDER_CHAIN[0].model).toBe("llama-3.3-70b-versatile");
  });

  it("NVIDIA-Mistral is the second elo (confirmado por Andre)", () => {
    expect(PROVIDER_CHAIN[1].id).toBe("nvidia-mistral");
    expect(PROVIDER_CHAIN[1].model).toBe("mistralai/mistral-medium-3.5-128b");
  });
});

describe("shouldFallback (AC-7)", () => {
  it("cascades on rate limit (429)", () => {
    expect(shouldFallback(429)).toBe(true);
  });

  it("cascades on any 5xx", () => {
    expect(shouldFallback(500)).toBe(true);
    expect(shouldFallback(503)).toBe(true);
    expect(shouldFallback(599)).toBe(true);
  });

  it("does NOT cascade on other 4xx (AC-3 — request failure, not availability)", () => {
    expect(shouldFallback(400)).toBe(false);
    expect(shouldFallback(401)).toBe(false);
    expect(shouldFallback(404)).toBe(false);
  });

  it("does NOT cascade on success", () => {
    expect(shouldFallback(200)).toBe(false);
  });
});

describe("buildRequestBody (AC-7)", () => {
  const messages = [{ role: "user", content: "oi" }];

  it("applies extraParams only for the elo that declares them (NVIDIA, not Groq)", () => {
    const groqBody = buildRequestBody(PROVIDER_CHAIN[0], { messages });
    const nvidiaBody = buildRequestBody(PROVIDER_CHAIN[1], { messages });

    expect(groqBody.reasoning_effort).toBeUndefined();
    expect(nvidiaBody.reasoning_effort).toBe("low");
  });

  it("uses the elo's own model, not a client-supplied one", () => {
    const body = buildRequestBody(PROVIDER_CHAIN[1], { messages, model: "algo-que-o-cliente-mandou" });
    expect(body.model).toBe("mistralai/mistral-medium-3.5-128b");
  });

  it("defaults temperature/max_tokens when omitted", () => {
    const body = buildRequestBody(PROVIDER_CHAIN[0], { messages });
    expect(body.temperature).toBe(0.85);
    expect(body.max_tokens).toBe(1024);
  });

  it("respects caller-provided temperature/max_tokens", () => {
    const body = buildRequestBody(PROVIDER_CHAIN[0], { messages, temperature: 0.5, max_tokens: 256 });
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(256);
  });

  it("always includes the messages array unchanged", () => {
    const body = buildRequestBody(PROVIDER_CHAIN[0], { messages });
    expect(body.messages).toBe(messages);
  });
});
