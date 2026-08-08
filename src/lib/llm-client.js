// src/lib/llm-client.js

/**
 * Transport layer for structured LLM generation.
 * Knows nothing about Cartogen geometry. Takes text/images and a JSON schema,
 * returns parsed JSON data.
 */

// Fallback active models in order of preference to avoid 429 quota limits
const MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const TRANSIENT = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIMEOUT_MS = 30_000;

export class LLMError extends Error {
    constructor(message, { kind, status, cause } = {}) {
        super(message);
        this.name = 'LLMError';
        this.kind = kind; // 'config' | 'network' | 'timeout' | 'rate_limit' | 'api' | 'blocked' | 'parse'
        this.status = status;
        this.cause = cause;
    }
}

/**
 * @param {object} opts
 * @param {string} opts.systemInstruction
 * @param {string} opts.userText
 * @param {Array<{mimeType: string, data: string}>} [opts.images]
 * @param {object} [opts.schema] JSON Schema for structured response
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{data: unknown, usage: object|null}>}
 */
export async function generateStructured({
    systemInstruction,
    userText,
    images = [],
    schema,
    signal,
}) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new LLMError('VITE_GEMINI_API_KEY is not set in .env.local', { kind: 'config' });
    }

    const parts = [
        ...images.map((img) => ({
            inlineData: { mimeType: img.mimeType, data: img.data },
        })),
        { text: userText },
    ];

    const body = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
            responseMimeType: 'application/json',
            ...(schema ? { responseJsonSchema: schema } : {}),
        },
    };

    let lastError = null;

    for (const model of MODELS) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        let attempt = 0;

        while (attempt < MAX_ATTEMPTS) {
            const timeoutController = new AbortController();
            const timer = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
            const signals = signal
                ? AbortSignal.any([signal, timeoutController.signal])
                : timeoutController.signal;

            let response;
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey 
                    },
                    body: JSON.stringify(body),
                    signal: signals,
                });
            } catch (err) {
                clearTimeout(timer);
                if (timeoutController.signal.aborted) {
                    throw new LLMError(`Request timed out after ${TIMEOUT_MS}ms`, { kind: 'timeout', cause: err });
                }
                throw new LLMError('Network request failed', { kind: 'network', cause: err });
            } finally {
                clearTimeout(timer);
            }

            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                
                console.error(`[LLM Client] API Error ${response.status}:`, detail);
                
                if (TRANSIENT.has(response.status)) {
                    lastError = new LLMError(`Model ${model} returned ${response.status}: ${detail.slice(0, 150)}`, {
                        kind: response.status === 429 ? 'rate_limit' : 'api',
                        status: response.status,
                    });
                    
                    attempt += 1;
                    if (attempt < MAX_ATTEMPTS) {
                        await sleep((2 ** attempt) * 500 + Math.random() * 300);
                        continue;
                    }
                    break; // exhausted this model, fall through to next model
                }
                
                if (response.status === 404) {
                    lastError = new LLMError(`Model ${model} error 404: ${detail.slice(0, 150)}`, { kind: 'api', status: 404 });
                    break; // bad model ID, move immediately to next model
                }
                
                throw new LLMError(`API error ${response.status}: ${detail.slice(0, 200)}`, {
                    kind: 'api',
                    status: response.status,
                });
            }

            const payload = await response.json();
            const candidate = payload?.candidates?.[0];

            if (!candidate || candidate.finishReason === 'SAFETY') {
                throw new LLMError('Response blocked by safety filters', { kind: 'blocked' });
            }
            if (candidate.finishReason === 'MAX_TOKENS') {
                throw new LLMError('Response truncated mid-JSON', { kind: 'parse' });
            }

            const text = candidate.content?.parts?.map((p) => p.text ?? '').join('').trim();
            if (!text) {
                throw new LLMError('Empty response from model', { kind: 'parse' });
            }

            try {
                return { data: JSON.parse(text), usage: payload.usageMetadata ?? null };
            } catch (err) {
                throw new LLMError('Model returned invalid JSON', { kind: 'parse', cause: err });
            }
        } // end while(attempt)
    } // end for(model)

    throw lastError || new LLMError('All model endpoints hit rate limits', { kind: 'rate_limit' });
}
