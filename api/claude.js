/**
 * Vercel Node.js serverless endpoint for Verbatim live AI steps.
 *
 * Security invariants:
 * - ANTHROPIC_API_KEY stays strictly server-side and is never echoed or logged.
 * - Visitors can only send an invention description and known corpus publication
 *   numbers; every prompt is built server-side from the canonical frozen corpus,
 *   preventing arbitrary proxy abuse.
 * - Claim-by-claim analyses execute per patent in parallel to minimize latency,
 *   avoid output truncation, and isolate partial upstream failures.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import * as E from '../shared/engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_FILE = path.resolve(__dirname, '..', 'public', 'data', 'corpus.json.gz');

const MAX_BODY_BYTES = 16 * 1024;
const MAX_ANALYSES_PER_IP_PER_HOUR = 12;
const MAX_CALLS_PER_IP_PER_HOUR = 40;
const MAX_TRACKED_IPS = 2000;
const HOUR_MS = 3600 * 1000;
const CALL_TIMEOUT_MS = 50_000;

function getModels() {
  return {
    quick: process.env.VERBATIM_QUICK_MODEL || E.QUICK_MODEL_DEFAULT,
    analysis: process.env.VERBATIM_ANALYSIS_MODEL || E.ANALYSIS_MODEL_DEFAULT,
  };
}

function getDailyLimit() {
  const parsed = Number.parseInt(process.env.MAX_LIVE_CALLS_PER_DAY || '300', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
}

const CLAIM_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    num: { type: 'integer' },
    status: { type: 'string', enum: ['overlaps', 'partial', 'none'] },
    quote: { type: 'string' },
    confidence: { type: 'number' },
    explanation: { type: 'string' },
    matched_elements: { type: 'array', items: { type: 'string' } },
    gap: { type: 'string' },
  },
  required: ['num', 'status', 'quote', 'confidence', 'explanation', 'matched_elements', 'gap'],
  additionalProperties: false,
};

export const SCHEMAS = Object.freeze({
  prepare: {
    type: 'object',
    properties: {
      english: { type: 'string' },
      in_domain: { type: 'boolean' },
    },
    required: ['english', 'in_domain'],
    additionalProperties: false,
  },
  rerank: {
    type: 'object',
    properties: {
      best: { type: 'array', items: { type: 'string' } },
    },
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
            claims: { type: 'array', items: CLAIM_ITEM_SCHEMA },
          },
          required: ['pub', 'claims'],
          additionalProperties: false,
        },
      },
    },
    required: ['patents'],
    additionalProperties: false,
  },
});

let cachedCorpus = null;
export function getCorpus() {
  if (!cachedCorpus) {
    const docs = JSON.parse(zlib.gunzipSync(fs.readFileSync(CORPUS_FILE)).toString('utf8'));
    cachedCorpus = new Map(docs.map((doc) => [doc.pub, doc]));
  }
  return cachedCorpus;
}

/**
 * Bounded per-instance sliding-window rate limiter.
 * Hard spend enforcement remains the budget cap configured on the Anthropic key.
 */
export function createRateLimiter() {
  const visitors = new Map();
  const daily = { day: '', analyses: 0 };

  return function check(ip, task, now = Date.now()) {
    const today = new Date(now).toISOString().slice(0, 10);
    if (daily.day !== today) {
      daily.day = today;
      daily.analyses = 0;
    }

    const dailyMax = getDailyLimit();
    const limit = task === 'analyze' ? MAX_ANALYSES_PER_IP_PER_HOUR : MAX_CALLS_PER_IP_PER_HOUR;

    for (const [key, entry] of visitors) {
      if (now - entry.start > HOUR_MS) visitors.delete(key);
    }

    let visitor = visitors.get(ip);
    if (!visitor) {
      if (visitors.size >= MAX_TRACKED_IPS) {
        const oldestKey = visitors.keys().next().value;
        if (oldestKey !== undefined) visitors.delete(oldestKey);
      }
      visitor = { start: now, calls: 0, analyses: 0 };
      visitors.set(ip, visitor);
    }

    const resetEpochSec = Math.ceil((visitor.start + HOUR_MS) / 1000);
    const retryAfterSec = Math.max(1, Math.ceil((visitor.start + HOUR_MS - now) / 1000));

    if (task === 'analyze' && daily.analyses >= dailyMax) {
      return { allowed: false, limit: dailyMax, remaining: 0, reset: resetEpochSec, retryAfter: 3600 };
    }
    if (visitor.calls >= MAX_CALLS_PER_IP_PER_HOUR) {
      return { allowed: false, limit, remaining: 0, reset: resetEpochSec, retryAfter: retryAfterSec };
    }
    if (task === 'analyze' && visitor.analyses >= MAX_ANALYSES_PER_IP_PER_HOUR) {
      return { allowed: false, limit, remaining: 0, reset: resetEpochSec, retryAfter: retryAfterSec };
    }

    visitor.calls += 1;
    if (task === 'analyze') {
      visitor.analyses += 1;
      daily.analyses += 1;
    }

    const used = task === 'analyze' ? visitor.analyses : visitor.calls;
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - used),
      reset: resetEpochSec,
      retryAfter: 0,
    };
  };
}

const defaultRateLimiter = createRateLimiter();

function sendJson(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extraHeaders)) {
    res.setHeader(k, String(v));
  }
  res.end(JSON.stringify(body));
}

function firstHeader(value) {
  return String(Array.isArray(value) ? value[0] : value || '')
    .split(',')[0]
    .trim();
}

export function isAllowedOrigin(req) {
  const origin = firstHeader(req.headers.origin);
  const host = firstHeader(req.headers['x-forwarded-host'] || req.headers.host);
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) throw new RangeError('body too large');
    return JSON.parse(req.body);
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new RangeError('body too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function validateRequest(body, corpus = getCorpus()) {
  const task = body && body.task;
  if (!['prepare', 'rerank', 'analyze'].includes(task)) return null;
  if (typeof body.invention !== 'string') return null;

  // Strip angle brackets so user input cannot break out of XML prompt delimiters.
  const invention = body.invention.trim().replace(/[<>]/g, ' ');
  if (invention.length < 20 || invention.length > 4000) return null;

  if (task === 'prepare') return { task, invention, docs: [] };

  const maxDocs = task === 'rerank' ? E.RERANK_CANDIDATES : E.TOP_K;
  if (!Array.isArray(body.pubs) || body.pubs.length === 0 || body.pubs.length > maxDocs) return null;
  if (new Set(body.pubs).size !== body.pubs.length) return null;
  if (!body.pubs.every((pub) => typeof pub === 'string' && corpus.has(pub))) return null;

  return {
    task,
    invention,
    docs: body.pubs.map((pub) => corpus.get(pub)),
  };
}

export function buildTaskRequest({ task, invention, docs }, models = getModels()) {
  const prompt =
    task === 'prepare'
      ? E.preparePrompt(invention)
      : task === 'rerank'
        ? E.rerankPrompt(invention, docs)
        : E.analysisPrompt(invention, docs);

  const request = {
    model: task === 'analyze' ? models.analysis : models.quick,
    max_tokens: task === 'analyze' ? 3500 : 1500,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: SCHEMAS[task] },
    },
    messages: [{ role: 'user', content: prompt }],
  };

  if (task === 'analyze') {
    request.betas = ['server-side-fallback-2026-07-01'];
    request.fallbacks = 'default';
  }

  return request;
}

function parseModelJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) throw new SyntaxError('invalid model JSON');
    return JSON.parse(text.slice(start, end + 1));
  }
}

async function invokeSingleCall(client, request) {
  const response = request.betas
    ? await client.beta.messages.create(request)
    : await client.messages.create(request);

  if (response.stop_reason === 'refusal') return { refused: true };

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  const input = response.usage?.input_tokens ?? 0;
  const output = response.usage?.output_tokens ?? 0;
  const model = response.model || request.model;
  const cost =
    E.computeCostUsd(model, input, output) ?? E.computeCostUsd(request.model, input, output) ?? 0;

  return {
    data: parseModelJson(text),
    truncated: response.stop_reason === 'max_tokens',
    model,
    usage: { in: input, out: output, cost, estimated: false },
  };
}

async function executeTask(apiKey, input) {
  const client = new Anthropic({ apiKey, timeout: CALL_TIMEOUT_MS, maxRetries: 1 });
  const models = getModels();

  if (input.task !== 'analyze' || input.docs.length === 1) {
    return invokeSingleCall(client, buildTaskRequest(input, models));
  }

  // Parallel per-patent execution lowers wall-clock latency and prevents token truncation.
  const settled = await Promise.allSettled(
    input.docs.map((doc) =>
      invokeSingleCall(
        client,
        buildTaskRequest({ task: 'analyze', invention: input.invention, docs: [doc] }, models),
      ),
    ),
  );

  const patents = [];
  let totalIn = 0;
  let totalOut = 0;
  let totalCost = 0;
  let truncated = false;
  let refusedCount = 0;
  let partialFailures = 0;
  let firstError = null;
  let appliedModel = models.analysis;

  for (const outcome of settled) {
    if (outcome.status === 'rejected') {
      partialFailures += 1;
      if (!firstError) firstError = outcome.reason;
      continue;
    }
    const value = outcome.value;
    if (value.refused) {
      refusedCount += 1;
      continue;
    }
    appliedModel = value.model || appliedModel;
    truncated = truncated || Boolean(value.truncated);
    totalIn += value.usage.in;
    totalOut += value.usage.out;
    totalCost += value.usage.cost;
    const list = Array.isArray(value.data?.patents) ? value.data.patents : [];
    patents.push(...list);
  }

  if (patents.length === 0) {
    if (refusedCount > 0 && !firstError) return { refused: true };
    if (firstError) throw firstError;
  }

  return {
    data: { patents },
    truncated,
    partialFailures,
    model: appliedModel,
    usage: {
      in: totalIn,
      out: totalOut,
      cost: totalCost,
      estimated: false,
    },
  };
}

export function createHandler({ checkRateLimit = defaultRateLimiter, corpusLoader = getCorpus } = {}) {
  return async function handler(req, res) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const models = getModels();

    if (req.method === 'GET') {
      return sendJson(res, 200, {
        available: Boolean(apiKey),
        models,
        limits: {
          hourlyAnalyses: MAX_ANALYSES_PER_IP_PER_HOUR,
          hourlyCalls: MAX_CALLS_PER_IP_PER_HOUR,
          dailyAnalyses: getDailyLimit(),
        },
      });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return sendJson(res, 405, { ok: false, code: 'method_not_allowed' });
    }

    if (!isAllowedOrigin(req)) {
      return sendJson(res, 403, { ok: false, code: 'forbidden' });
    }

    if (!apiKey) {
      return sendJson(res, 503, { ok: false, code: 'ai_unavailable' });
    }

    let input;
    try {
      input = validateRequest(await readBody(req), corpusLoader());
    } catch (error) {
      return sendJson(res, error instanceof RangeError ? 413 : 400, {
        ok: false,
        code: 'invalid_request',
      });
    }

    if (!input) {
      return sendJson(res, 422, { ok: false, code: 'invalid_request' });
    }

    const ip =
      firstHeader(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for']) || 'unknown';
    const rl = checkRateLimit(ip, input.task);
    const rateHeaders = {
      'X-RateLimit-Limit': rl.limit,
      'X-RateLimit-Remaining': rl.remaining,
      'X-RateLimit-Reset': rl.reset,
    };

    if (!rl.allowed) {
      return sendJson(
        res,
        429,
        { ok: false, code: 'rate_limited' },
        { ...rateHeaders, 'Retry-After': rl.retryAfter },
      );
    }

    try {
      const result = await executeTask(apiKey, input);
      if (result.refused) {
        return sendJson(res, 422, { ok: false, code: 'refused' }, rateHeaders);
      }
      return sendJson(res, 200, { ok: true, ...result }, rateHeaders);
    } catch (error) {
      // Never log user invention text or API credentials.
      console.error(
        'claude_call_failed',
        error instanceof Anthropic.APIError ? error.status : error?.name || 'Error',
      );
      if (
        error instanceof Anthropic.AuthenticationError ||
        error instanceof Anthropic.PermissionDeniedError
      ) {
        return sendJson(res, 503, { ok: false, code: 'ai_unavailable' }, rateHeaders);
      }
      if (error instanceof Anthropic.RateLimitError) {
        return sendJson(res, 429, { ok: false, code: 'rate_limited' }, rateHeaders);
      }
      return sendJson(res, 502, { ok: false, code: 'upstream_error' }, rateHeaders);
    }
  };
}

export default createHandler();
