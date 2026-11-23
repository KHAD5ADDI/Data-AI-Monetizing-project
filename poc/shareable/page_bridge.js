/* Connects the team's interface (poc/static/index.html) to the browser engine.
   The page still calls /api/meta and /api/analyze: this file answers them locally, so no server or API key is needed.
   Claude is used through the viewer's own account when the page runs in a Claude viewer.
   Otherwise the search and the quote check still run, with a keyword comparison that is labelled as such. */
(function () {
  'use strict';
  const E = window.VerbatimEngine;
  const META = JSON.parse(document.getElementById('verbatim-meta').textContent);
  const ANALYSIS_MODEL = 'claude-sonnet-5-5';
  const PRICE = { in: 2, out: 10 }; // USD per million tokens, Anthropic list price
  const nativeFetch = window.fetch.bind(window);

  const samplePromise = window.claude && typeof window.claude.use === 'function'
    ? window.claude.use('sample').catch(() => null)
    : Promise.resolve(null);
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

  function failureNote(error) {
    const code = error && error.code;
    if (code === 'not_granted' || code === 'sampling_disabled') return 'Claude is not enabled for this viewer, so this result uses the keyword comparison.';
    if (code === 'rate_limited') return 'Claude usage limit reached, so this result uses the keyword comparison. Retry later for the AI analysis.';
    return 'The Claude analysis did not complete, so this result uses the keyword comparison. You can retry.';
  }

  async function meta() {
    await indexPromise;
    const sample = await within(samplePromise, 3000);
    return { ...META, llm_available: !!sample, model: ANALYSIS_MODEL, ready: true };
  }

  async function analyze({ text, force }) {
    const t0 = performance.now();
    const invention = String(text || '').trim();
    if (invention.length < 20 || invention.length > 4000) {
      return json({ mode: 'error', notices: [{ level: 'err', text: 'Please describe the invention in 20 to 4,000 characters.' }] }, 422);
    }
    const index = await indexPromise;
    const sample = await within(samplePromise, 3000);
    const notices = [];
    let query = invention;
    let inDomain = null;
    let chars = { in: 0, out: 0 };
    let claudeFailed = false;

    if (sample) {
      try {
        const prompt = E.preparePrompt(invention);
        const reply = await sample(prompt, { modelTier: 'quick', cache: false });
        const parsed = parseReply(reply.text);
        if (typeof parsed.english === 'string' && parsed.english.trim()) query = parsed.english.trim();
        if (typeof parsed.in_domain === 'boolean') inDomain = parsed.in_domain;
        chars = { in: prompt.length, out: reply.text.length };
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

    if (sample && !claudeFailed) {
      try {
        const prompt = E.rerankPrompt(invention, found.hits.map(toPatent));
        const reply = await sample(prompt, { modelTier: 'quick', cache: false });
        const ranked = E.applyRerank(parseReply(reply.text).best, found.hits, (h) => index.docs[h.id].pub);
        patents = ranked.map(toPatent);
        chars = { in: chars.in + prompt.length, out: chars.out + reply.text.length };
      } catch (error) {
        if (error && ['not_granted', 'sampling_disabled', 'rate_limited'].includes(error.code)) {
          claudeFailed = true;
          notices.push({ level: 'warn', text: failureNote(error) });
        } else {
          notices.push({ level: 'warn', text: 'Claude could not reorder the candidates, so the search order is kept.' });
        }
      }
    }

    if (sample && !claudeFailed) {
      try {
        const prompt = E.analysisPrompt(invention, patents);
        const reply = await sample(prompt, { model: ANALYSIS_MODEL, modelTier: 'default', effort: 'low', cache: false });
        const parsed = parseReply(reply.text);
        const answers = new Map((Array.isArray(parsed.patents) ? parsed.patents : []).map((p) => [p && p.pub, p]));
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
        const inTokens = Math.ceil(chars.in / 4) + tokens(prompt);
        const outTokens = Math.ceil(chars.out / 4) + tokens(reply.text);
        const model = reply.modelApplied || `Claude (${reply.modelTierApplied} tier)`;
        return json({
          mode: 'live', best: found.best, patents, notices, seconds: seconds(),
          usage: { model, in: inTokens, out: outTokens, cost: (inTokens * PRICE.in + outTokens * PRICE.out) / 1e6, price_in: PRICE.in, price_out: PRICE.out, detail: 'about 4 characters per token, priced as Sonnet 5.5' },
        });
      } catch (error) {
        notices.push({ level: 'warn', text: failureNote(error) });
      }
    } else if (!sample) {
      notices.push({ level: 'warn', text: 'Keyword comparison, no AI: open this page in Claude for the AI claim analysis. Every quote shown is still checked word for word against the claim.' });
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
