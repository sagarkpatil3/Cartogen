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

/** Apply the small, safe repairs an LLM commonly needs. Does not force validity. */
function repair(op) {
    if (!op || typeof op !== 'object') return op;
    const fixed = { ...op };
    if (fixed.parameters && typeof fixed.parameters === 'object') {
        const p = { ...fixed.parameters };
        // string numbers are handled by z.coerce in the schema, so we only fix colors here
        p.wallColor = expandHex(p.wallColor);
        p.roofColor = expandHex(p.roofColor);
        fixed.parameters = p;
    }
    return fixed;
}

/**
 * Validate untrusted LLM output against the operation schema.
 *
 * Strategy: repair common quirks, validate the whole list, and — if that fails —
 * validate each operation individually so one bad item doesn't discard the good
 * ones. Partial success is reported EXPLICITLY (never hidden behind valid:true).
 *
 * @param {any} raw  parsed JSON from the model (object, array, or garbage)
 * @returns {ValidationResult}
 */
export function validateOperations(raw) {
    if (raw == null) {
        return { valid: false, operations: [], partial: false, dropped: 0, errors: ['Empty input'] };
    }

    // normalize a single operation object into a list
    const asList = Array.isArray(raw) ? raw : raw.action ? [raw] : null;
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