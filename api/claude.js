'use strict';
/* Server side of the Verbatim PoC on Vercel. The API key stays here.
   Visitors can send only an invention description and known patent numbers: every prompt is built
   on the server from the frozen corpus, so this endpoint cannot be used as a general Claude proxy. */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { default: Anthropic } = require('@anthropic-ai/sdk');
const E = require('../poc/shareable/browser_engine.js');

const QUICK_MODEL = 'claude-haiku-5-5';
const ANALYSIS_MODEL = 'claude-sonnet-5-5';
const PRICES = { [QUICK_MODEL]: { in: 0.1, out: 0.5 }, [ANALYSIS_MODEL]: { in: 2, out: 10 } };
const MAX_BODY_BYTES = 16 * 1024;
const MAX_ANALYSES_PER_IP_PER_HOUR = 12;
const MAX_CALLS_PER_IP_PER_HOUR = 40;
const HOUR_MS = 3600 * 1000;

const SCHEMAS = {
  prepare: {
    type: 'object',
    properties: { english: { type: 'string' }, in_domain: { type: 'boolean' } },
    required: ['english', 'in_domain'],
    additionalProperties: false,
  },
  rerank: {
    type: 'object',
    properties: { best: { type: 'array', items: { type: 'string' } } },
    required: ['best'],
    additionalProperties: false,
  },
  analyze: {
    type: 'object',
    properties: {
      patents: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            pub: { type: 'string' },
            claims: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  num: { type: 'integer' },
                  status: { type: 'string', enum: ['overlaps', 'partial', 'none'] },
                  quote: { type: 'string' },
                  confidence: { type: 'number' },
                  explanation: { type: 'string' },
                },
                required: ['num', 'status', 'quote', 'confidence', 'explanation'],
                additionalProperties: false,
              },
            },
          },
          required: ['pub', 'claims'],
          additionalProperties: false,
        },
      },
    },
    required: ['patents'],
    additionalProperties: false,
  },
};

let corpus = null;
function getCorpus() {
  if (!corpus) {
    const file = path.join(__dirname, '..', 'server_data', 'corpus.json.gz');
    const docs = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
    corpus = new Map(docs.map((d) => [d.pub, d]));
  }
  return corpus;
}

/* Best effort per server instance. The hard budget is the spending limit set on the API key. */
const visitors = new Map();
const daily = { day: '', analyses: 0 };

function allow(ip, task, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  if (daily.day !== today) { daily.day = today; daily.analyses = 0; }
  const dailyMax = Number.parseInt(process.env.MAX_LIVE_CALLS_PER_DAY || '300', 10) || 300;
  if (task === 'analyze' && daily.analyses >= dailyMax) return false;
  for (const [key, value] of visitors) if (now - value.start > HOUR_MS) visitors.delete(key);
  const visitor = visitors.get(ip) || { start: now, calls: 0, analyses: 0 };
  visitors.set(ip, visitor);
  if (visitor.calls >= MAX_CALLS_PER_IP_PER_HOUR) return false;
  if (task === 'analyze' && visitor.analyses >= MAX_ANALYSES_PER_IP_PER_HOUR) return false;
  visitor.calls += 1;
  if (task === 'analyze') { visitor.analyses += 1; daily.analyses += 1; }
  return true;
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function firstHeader(value) {
  return String(Array.isArray(value) ? value[0] : value || '').split(',')[0].trim();
}

function sameOrigin(req) {
  try {
    return new URL(firstHeader(req.headers.origin)).host === firstHeader(req.headers['x-forwarded-host'] || req.headers.host);
  } catch (_) {
    return false;
  }
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new RangeError('body too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function validate(body) {
  const task = body && body.task;
  if (!['prepare', 'rerank', 'analyze'].includes(task)) return null;
  if (typeof body.invention !== 'string') return null;
  const invention = body.invention.trim().replace(/[<>]/g, ' ');
  if (invention.length < 20 || invention.length > 4000) return null;
  if (task === 'prepare') return { task, invention, docs: [] };
  const maxDocs = task === 'rerank' ? 20 : E.TOP_K;
  if (!Array.isArray(body.pubs) || body.pubs.length === 0 || body.pubs.length > maxDocs) return null;
  if (new Set(body.pubs).size !== body.pubs.length) return null;
  const known = getCorpus();
  if (!body.pubs.every((pub) => typeof pub === 'string' && known.has(pub))) return null;
  return { task, invention, docs: body.pubs.map((pub) => known.get(pub)) };
}

function buildRequest({ task, invention, docs }) {
  const prompt = task === 'prepare' ? E.preparePrompt(invention)
    : task === 'rerank' ? E.rerankPrompt(invention, docs)
      : E.analysisPrompt(invention, docs);
  const request = {
    model: task === 'analyze' ? ANALYSIS_MODEL : QUICK_MODEL,
    max_tokens: task === 'analyze' ? 12000 : 1500,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMAS[task] } },
    messages: [{ role: 'user', content: prompt }],
  };
  if (task === 'analyze') {
    request.betas = ['server-side-fallback-2026-07-01'];
    request.fallbacks = 'default';
  }
  return request;
}

async function callClaude(apiKey, request) {
  const client = new Anthropic({ apiKey, timeout: 50000, maxRetries: 1 });
  const response = request.betas ? await client.beta.messages.create(request) : await client.messages.create(request);
  if (response.stop_reason === 'refusal') return { refused: true };
  const text = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('');
  const price = PRICES[response.model] || PRICES[request.model];
  const input = response.usage.input_tokens;
  const output = response.usage.output_tokens;
  return {
    data: JSON.parse(text),
    truncated: response.stop_reason === 'max_tokens',
    model: response.model,
    usage: { in: input, out: output, cost: (input * price.in + output * price.out) / 1e6, estimated: false },
  };
}

module.exports = async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (req.method === 'GET') return send(res, 200, { available: Boolean(apiKey) });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { ok: false, code: 'method_not_allowed' });
  }
  if (!sameOrigin(req)) return send(res, 403, { ok: false, code: 'forbidden' });
  if (!apiKey) return send(res, 503, { ok: false, code: 'ai_unavailable' });

  let input;
  try {
    input = validate(await readBody(req));
  } catch (error) {
    return send(res, error instanceof RangeError ? 413 : 400, { ok: false, code: 'invalid_request' });
  }
  if (!input) return send(res, 422, { ok: false, code: 'invalid_request' });

  const ip = firstHeader(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for']) || 'unknown';
  if (!allow(ip, input.task)) return send(res, 429, { ok: false, code: 'rate_limited' });

  try {
    const result = await callClaude(apiKey, buildRequest(input));
    if (result.refused) return send(res, 422, { ok: false, code: 'refused' });
    return send(res, 200, { ok: true, ...result });
  } catch (error) {
    // The invention text and the key are never logged.
    console.error('claude_call_failed', error instanceof Anthropic.APIError ? error.status : error.name);
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      return send(res, 503, { ok: false, code: 'ai_unavailable' });
    }
    if (error instanceof Anthropic.RateLimitError) return send(res, 429, { ok: false, code: 'rate_limited' });
    return send(res, 502, { ok: false, code: 'upstream_error' });
  }
};
