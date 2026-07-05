import { isFresh, makeThrottle, STALE_MS, PING_MS } from '../sync/live';

describe('isFresh', () => {
  it('fresco dentro da janela, velho fora', () => {
    const now = 100000;
    expect(isFresh({ at: now - 1000 }, now)).toBe(true);
    expect(isFresh({ at: now - STALE_MS - 1 }, now)).toBe(false);
    expect(isFresh(null, now)).toBe(false);
    expect(isFresh({}, now)).toBe(false);
  });
  it('janela custom (ping 3s)', () => {
    const now = 50000;
    expect(isFresh({ at: now - PING_MS + 1 }, now, PING_MS)).toBe(true);
    expect(isFresh({ at: now - PING_MS - 1 }, now, PING_MS)).toBe(false);
  });
});

describe('makeThrottle (trailing)', () => {
  it('1ª chamada dispara já; seguidas na janela agrupam com o último argumento', () => {
    let t = 0;
    const timers = [];
    const calls = [];
    const th = makeThrottle((v) => calls.push(v), 250, () => t,
      { set: (fn, ms) => { timers.push({ fn, due: t + ms }); return timers.length; }, clear: () => {} });
    th('a');                    // dispara imediato
    expect(calls).toEqual(['a']);
    t = 100; th('b');           // dentro da janela → agenda trailing
    t = 200; th('c');           // atualiza pending, não re-agenda
    expect(calls).toEqual(['a']);
    t = 250; timers[0].fn();    // trailing dispara com o último valor
    expect(calls).toEqual(['a', 'c']);
    t = 600; th('d');           // janela livre → imediato
    expect(calls).toEqual(['a', 'c', 'd']);
  });
});
