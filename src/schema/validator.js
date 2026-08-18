// @ts-check
import { OperationListSchema, OperationSchema } from './operations.js';

/**
 * @typedef {import('./op-schema.js').Operation} Operation
 * @typedef {{
 *   valid: boolean,
 *   operations: Operation[],
 *   partial: boolean,
 *   dropped: number,
 *   errors: string[],
 * }} ValidationResult
 */

/** Expand a 3-digit hex color (#fff) to 6 digits (#ffffff). */
function expandHex(value) {
    if (typeof value === 'string' && /^#[0-9a-fA-F]{3}$/.test(value)) {
        const [, r, g, b] = value;
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    return value;
}

/** Apply deep, universal repairs to handle all LLM payload structures & variations */
function repair(op) {
    if (!op || typeof op !== 'object') return op;
    const fixed = { ...op };

    // 1) Normalize action synonyms or type/action field confusion
    if (!fixed.action && fixed.type && typeof fixed.type === 'string') {
        fixed.action = fixed.type;
    }

    // 2) Normalize compose_object variations (flattened properties vs nested parameters)
    if (fixed.action === 'compose_object') {
        let params = fixed.parameters;
        if (!params || typeof params !== 'object' || typeof params === 'string') {
            params = {};
        }

        fixed.parameters = {
            name: params.name || fixed.name || 'Composed Object',
            massing: params.massing || fixed.massing || '',
            parts: Array.isArray(params.parts)
                ? params.parts
                : Array.isArray(fixed.parts)
                ? fixed.parts
                : [],
        };
    }

    // 3) General parameters object normalization & coercions
    if (fixed.parameters && typeof fixed.parameters === 'object') {
        const p = { ...fixed.parameters };
        p.wallColor = expandHex(p.wallColor);
        p.roofColor = expandHex(p.roofColor);

        // Normalize composed object parts array if present
        if (Array.isArray(p.parts)) {
            p.parts = p.parts.map((part) => {
                if (part == null || typeof part !== 'object') {
                    return { shape: 'box', size: [1, 1, 1], position: [0, 0.5, 0], color: '#94a3b8' };
                }
                const pt = { ...part };
                if (!pt.shape && pt.type) pt.shape = pt.type;
                if (!pt.shape) pt.shape = 'box';

                // Coerce position & size to 3D numeric tuples
                if (!Array.isArray(pt.position) || pt.position.length < 3) {
                    pt.position = [0, 0.5, 0];
                } else {
                    pt.position = pt.position.slice(0, 3).map(Number);
                }

                if (['box', 'wedge'].includes(pt.shape)) {
                    if (!Array.isArray(pt.size) || pt.size.length < 3) {
                        pt.size = [1, 1, 1];
                    } else {
                        pt.size = pt.size.slice(0, 3).map((n) => Math.max(0.05, Number(n) || 1));
                    }
                }

                if (pt.color) pt.color = expandHex(pt.color) || '#94a3b8';
                else pt.color = '#94a3b8';

                return pt;
            });
        }

        fixed.parameters = p;
    }
    return fixed;
}

/**
 * Validate untrusted LLM output against the operation schema.
 * Supports single operation objects, arrays of operations, wrapped { operations: [...] }, or raw text string responses.
 *
 * @param {any} raw parsed JSON from the model (object, array, or string)
 * @returns {ValidationResult}
 */
export function validateOperations(raw) {
    if (raw == null) {
        return { valid: false, operations: [], partial: false, dropped: 0, errors: ['Empty input'] };
    }

    // Try parsing string JSON if raw comes as a string
    let parsedRaw = raw;
    if (typeof raw === 'string') {
        try {
            parsedRaw = JSON.parse(raw);
        } catch (e) {
            return { valid: false, operations: [], partial: false, dropped: 0, errors: ['Invalid JSON string'] };
        }
    }

    // Extract operations list from all common container formats
    let asList = null;
    if (Array.isArray(parsedRaw)) {
        asList = parsedRaw;
    } else if (parsedRaw && typeof parsedRaw === 'object') {
        if (Array.isArray(parsedRaw.operations)) {
            asList = parsedRaw.operations;
        } else if (parsedRaw.action || parsedRaw.type) {
            asList = [parsedRaw];
        }
    }
    if (!asList) {
        return {
            valid: false, operations: [], partial: false, dropped: 0,
            errors: ['Expected an operation or a list of operations'],
        };
    }

    const repaired = asList.map(repair);

    // fast path: the whole list is valid after repair
    const whole = OperationListSchema.safeParse(repaired);
    if (whole.success) {
        return { valid: true, operations: whole.data, partial: false, dropped: 0, errors: [] };
    }

    // slow path: validate each op alone so good ones survive bad ones
    const operations = [];
    const errors = [];
    repaired.forEach((op, i) => {
        const one = OperationSchema.safeParse(op);
        if (one.success) {
            operations.push(one.data);
        } else {
            const why = one.error.issues.map((issue) => issue.message).join('; ');
            errors.push(`operation ${i} (${op?.action ?? 'unknown'}): ${why}`);
        }
    });

    const dropped = repaired.length - operations.length;

    // some survived: usable, but the caller MUST know part of the request was lost
    if (operations.length > 0) {
        return { valid: true, operations, partial: dropped > 0, dropped, errors };
    }

    // nothing survived
    return { valid: false, operations: [], partial: false, dropped, errors };
}