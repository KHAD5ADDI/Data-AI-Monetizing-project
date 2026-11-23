/* Connects the team's interface (poc/static/index.html) to the browser engine.
   The page still calls /api/meta and /api/analyze: this file answers them in the browser.
   Claude is reached through the viewer's account in a Claude artifact, or through /api/claude on Vercel.
   Without Claude, the search and the quote check still run, with a keyword comparison labelled as such. */
(function () {
  'use strict';
  const E = window.VerbatimEngine;
  const META = JSON.parse(document.getElementById('verbatim-meta').textContent);
  const HOSTING = META.hosting === 'vercel' ? 'vercel' : 'artifact';
  const ANALYSIS_MODEL = 'claude-sonnet-5-5';
  const PRICE = { in: 2, out: 10 }; // USD per million tokens, Anthropic list price
  const STOP_AI = ['not_granted', 'sampling_disabled', 'rate_limited', 'ai_unavailable'];
  const nativeFetch = window.fetch.bind(window);
  const within = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

  const indexPromise = (async () => {
    const b64 = document.getElementById('verbatim-corpus').textContent.trim();
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return E.buildIndex(await new Response(stream).json());
  })();

  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const tokens = (text) => Math.ceil(String(text).length / 4);

  function parseReply(text) {
    try { return JSON.parse(text); } catch (_) { /* the reply may have text around the JSON */ }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('no JSON in the reply');
    return JSON.parse(text.slice(start, end + 1));
  }

  function artifactProvider() {
    const samplePromise = window.claude && typeof window.claude.use === 'function'
      ? window.claude.use('sample').catch(() => null)
      : Promise.resolve(null);
    const run = async (prompt, options) => {
      const sample = await within(samplePromise, 3000);
      if (!sample) throw { code: 'not_granted' };
      const reply = await sample(prompt, { ...options, cache: false });
      const input = tokens(prompt);
      const output = tokens(reply.text);
      return {
        data: parseReply(reply.text),
        truncated: reply.truncated,
        model: reply.modelApplied || `Claude (${reply.modelTierApplied} tier)`,
        usage: { in: input, out: output, cost: (input * PRICE.in + output * PRICE.out) / 1e6, estimated: true },
      };
    };
    return {
      available: async () => !!(await within(samplePromise, 3000)),
      prepare: (invention) => run(E.preparePrompt(invention), { modelTier: 'quick' }),
      rerank: (invention, candidates) => run(E.rerankPrompt(invention, candidates), { modelTier: 'quick' }),
      analyze: (invention, patents) => run(E.analysisPrompt(invention, patents), { model: ANALYSIS_MODEL, modelTier: 'default', effort: 'low' }),
    };
  }

  function vercelProvider() {
    const call = async (task, body) => {
      const response = await nativeFetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, ...body }) });
      let reply = null;
      try { reply = await response.json(); } catch (_) { /* handled below */ }
      if (!response.ok || !reply || !reply.ok) throw { code: (reply && reply.code) || 'upstream_error' };
      return reply;
    };
    return {
      available: async () => {
        try {
          const response = await nativeFetch('/api/claude', { cache: 'no-store' });
          return !!(await response.json()).available;
        } catch (_) { return false; }
      },
      prepare: (invention) => call('prepare', { invention }),
      rerank: (invention, candidates) => call('rerank', { invention, pubs: candidates.map((p) => p.pub) }),
      analyze: (invention, patents) => call('analyze', { invention, pubs: patents.map((p) => p.pub) }),
    };
  }

  const ai = HOSTING === 'vercel' ? vercelProvider() : artifactProvider();

  function failureNote(error) {
    const code = error && error.code;
    if (code === 'not_granted' || code === 'sampling_disabled') return 'Claude is not enabled for this viewer, so this result uses the keyword comparison.';
    if (code === 'ai_unavailable') return 'The AI service is not available right now, so this result uses the keyword comparison.';
    if (code === 'rate_limited') return 'The AI usage limit is reached, so this result uses the keyword comparison. Retry later for the AI analysis.';
    if (code === 'refused') return 'Claude declined to analyze this description, so this result uses the keyword comparison.';
    return 'The Claude analysis did not complete, so this result uses the keyword comparison. You can retry.';
  }

  async function meta() {
    await indexPromise;
    return { ...META, llm_available: await ai.available(), model: ANALYSIS_MODEL, ready: true };
  }

  async function analyze({ text, force }) {
    const t0 = performance.now();
    const invention = String(text || '').trim();
    if (invention.length < 20 || invention.length > 4000) {
      return json({ mode: 'error', notices: [{ level: 'err', text: 'Please describe the invention in 20 to 4,000 characters.' }] }, 422);
    }
    const index = await indexPromise;
    const aiAvailable = await ai.available();
    const notices = [];
    const total = { in: 0, out: 0, cost: 0, estimated: false };
    const count = (usage) => {
      total.in += usage.in;
      total.out += usage.out;
      total.cost += usage.cost;
      total.estimated = total.estimated || usage.estimated;
    };
    let query = invention;
    let inDomain = null;
    let claudeFailed = false;

    if (aiAvailable) {
      try {
        const reply = await ai.prepare(invention);
        if (typeof reply.data.english === 'string' && reply.data.english.trim()) query = reply.data.english.trim();
        if (typeof reply.data.in_domain === 'boolean') inDomain = reply.data.in_domain;
        count(reply.usage);
      } catch (error) {
        claudeFailed = true;
        notices.push({ level: 'warn', text: failureNote(error) });
      }
    }

    const found = E.search(index, query, 20);
    if (!found.hits.length) {
      return json({ mode: 'error', notices: [{ level: 'err', text: 'No technical term could be matched. Describe how the invention works.' }] });
    }
    const toPatent = (h) => {
      const d = index.docs[h.id];
      return { pub: d.pub, title: d.title, abstract: d.abstract, score: h.score, n_claims: d.n_claims, claims: d.claims };
    };
    let patents = found.hits.slice(0, E.TOP_K).map(toPatent);
    const seconds = () => (performance.now() - t0) / 1000;
    const outOfDomain = inDomain === null ? E.isOutOfDomain(found.domain) : !inDomain;
    if (outOfDomain && !force) {
      const why = inDomain === false
        ? 'Claude judged that the core of this invention is not computing or data processing.'
        : `Only ${Math.round(found.domain * 100)}% of the terms in this description are common in the database, below the ${Math.round(E.OOD_THRESHOLD * 100)}% threshold.`;
      return json({ mode: 'ood', best: found.domain, threshold: E.OOD_THRESHOLD, why, patents, notices, seconds: seconds() });
    }
    if (force) notices.push({ level: 'warn', text: 'Analysis launched outside the covered domain: interpret with caution.' });

    if (aiAvailable && !claudeFailed) {
      try {
        const reply = await ai.rerank(invention, found.hits.map(toPatent));
        patents = E.applyRerank(reply.data.best, found.hits, (h) => index.docs[h.id].pub).map(toPatent);
        count(reply.usage);
      } catch (error) {
        if (error && STOP_AI.includes(error.code)) {
          claudeFailed = true;
          notices.push({ level: 'warn', text: failureNote(error) });
        } else {
          notices.push({ level: 'warn', text: 'Claude could not reorder the candidates, so the search order is kept.' });
        }
      }
    }

    if (aiAvailable && !claudeFailed) {
      try {
        const reply = await ai.analyze(invention, patents);
        const answers = new Map((Array.isArray(reply.data.patents) ? reply.data.patents : []).map((p) => [p && p.pub, p]));
        let analyzed = 0;
        for (const p of patents) {
          const answer = answers.get(p.pub);
          const claims = p.claims.slice(0, E.MAX_CLAIMS_ANALYZED);
          if (answer) { Object.assign(p, E.validateAnalysis(answer.claims, claims)); analyzed += 1; }
          else { p.rows = null; p.rejected = 0; }
        }
        if (!analyzed) throw new Error('no patent in the reply');
        if (analyzed < patents.length) notices.push({ level: 'warn', text: `${patents.length - analyzed} patent(s) not analyzed by Claude.` });
        if (reply.truncated) notices.push({ level: 'warn', text: 'The Claude answer was cut short: some claims may be missing.' });
        count(reply.usage);
        return json({
          mode: 'live', best: found.best, patents, notices, seconds: seconds(),
          usage: {
            model: reply.model, in: total.in, out: total.out, cost: total.cost, estimated: total.estimated, price_in: PRICE.in, price_out: PRICE.out,
            detail: total.estimated ? 'about 4 characters per token, priced as Sonnet 5.5' : 'real usage across all Claude calls',
          },
        });
      } catch (error) {
        notices.push({ level: 'warn', text: failureNote(error) });
      }
    } else if (!aiAvailable) {
      notices.push({
        level: 'warn',
        text: HOSTING === 'vercel'
          ? 'Keyword comparison, no AI: the AI service is not configured yet. Every quote shown is still checked word for word against the claim.'
          : 'Keyword comparison, no AI: open this page in Claude for the AI claim analysis. Every quote shown is still checked word for word against the claim.',
      });
    }

    for (const p of patents) Object.assign(p, E.keywordAnalysis(index, query, p));
    return json({ mode: 'keyword', best: found.best, patents, notices, usage: null, seconds: seconds() });
  }

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input && input.url;
    if (url === '/api/meta') return json(await meta());
    if (url === '/api/analyze') {
      try { return await analyze(JSON.parse(init.body)); }
      catch (error) { return json({ mode: 'error', notices: [{ level: 'err', text: 'Unexpected error. Please retry.' }] }, 500); }
    }
    return nativeFetch(input, init);
  };
})();
