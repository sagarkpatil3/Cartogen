// @ts-check
import { z } from 'zod';
import { ComposedObjectSchema, PartSchema } from '../ops/part-schema.js';
/**
 * OPERATION SCHEMA — the contract the AI must satisfy.
 *
 * The model outputs JSON; this schema validates it before anything touches the scene.
 * Every field is bounded, so even a hallucinated value (height: 99999) is rejected
 * rather than applied. This is the safety layer for untrusted model output.
 *
 * Only operations the generators can actually execute today are included. Ambitions
 * that need generators we haven't built (bridges, lamps, window styles) are noted at
 * the bottom and added when the geometry exists — a schema should never promise more
 * than the app can do, or the AI emits operations that validate but silently no-op.
 */

// ── shared building blocks ───────────────────────────────────────────

/** A hex color like #a1b2c3. Constrained so the model can't return "reddish". */
const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #rrggbb hex color');

/**
 * TARGET — how an operation points at an EXISTING node to modify it.
 * Either the current selection, or a node matched by name ("the library").
 */
const Target = z
    .object({
        by: z.enum(['selected', 'name']).default('selected'),
        name: z.string().optional(), // required when by === 'name'
    })
    .refine((t) => t.by !== 'name' || !!t.name, {
        message: 'a name is required when targeting by name',
    });

/**
 * LOCATION — where a NEW thing should be placed.
 * Near the current selection, near a named node, or at explicit local coordinates.
 */
const Location = z
    .object({
        at: z.enum(['selection', 'named', 'coords']).default('selection'),
        name: z.string().optional(), // when at === 'named'
        x: z.number().optional(), // when at === 'coords'
        z: z.number().optional(),
    })
    .refine((l) => l.at !== 'named' || !!l.name, { message: 'name required for at:named' })
    .refine((l) => l.at !== 'coords' || (l.x != null && l.z != null), {
        message: 'x and z required for at:coords',
    });

// ── operations (only ones the generators can execute today) ──────────

/** Scatter trees in an area. */
export const ScatterTreesOp = z.object({
    action: z.literal('scatter_trees'),
    location: Location.default({ at: 'selection' }),
    parameters: z
        .object({
            count: z.coerce.number().int().min(1).max(200).default(30),
            radius: z.coerce.number().min(10).max(300).default(70),
            onlyOnGrass: z.boolean().default(false),
        })
        .default({}),
});

/** Add a simple extruded building at a location. */
export const AddBuildingOp = z.object({
    action: z.literal('add_building'),
    location: Location.default({ at: 'selection' }),
    parameters: z
        .object({
            name: z.string().default('New Building'),
            kind: z.enum(['commercial', 'civic', 'residential', 'landmark', 'office', 'retail', 'industrial', 'generic']).default('commercial'),
            height: z.coerce.number().min(3).max(300).default(18),
            floors: z.coerce.number().min(1).max(100).optional(),
            width: z.coerce.number().min(5).max(120).default(24),
            depth: z.coerce.number().min(5).max(120).default(18),
            wallColor: HexColor.optional(),
            roofColor: HexColor.optional(),
        })
        .default({}),
});

/** Add a path, road, staircase, or ADA ramp. */
export const AddPathOp = z.object({
    action: z.literal('add_path'),
    location: Location.default({ at: 'selection' }),
    parameters: z
        .object({
            name: z.string().default('New Path'),
            pathClass: z.enum(['major', 'street', 'walkway']).default('walkway'),
            pathType: z.enum(['standard', 'stairs', 'accessible_ramp']).default('standard'),
            elevation: z.coerce.number().min(-10).max(100).default(0),
            stepCount: z.coerce.number().min(0).max(100).default(0),
            isAccessible: z.boolean().default(true),
            handrail: z.boolean().default(false),
        })
        .default({}),
});

/** Change the height of an existing building. */
export const SetBuildingHeightOp = z.object({
    action: z.literal('set_building_height'),
    target: Target.default({ by: 'selected' }),
    parameters: z.object({
        height: z.coerce.number().min(3).max(300),
    }),
});

/** Recolor an existing building. At least one color must be given. */
export const RecolorBuildingOp = z.object({
    action: z.literal('recolor_building'),
    target: Target.default({ by: 'selected' }),
    parameters: z
        .object({
            wallColor: HexColor.optional(),
            roofColor: HexColor.optional(),
        })
        .refine((p) => p.wallColor || p.roofColor, {
            message: 'provide at least one of wallColor or roofColor',
        }),
});

/** Change the material of an existing surface (grass -> water, etc.). */
export const SetSurfaceMaterialOp = z.object({
    action: z.literal('set_surface_material'),
    target: Target.default({ by: 'selected' }),
    parameters: z.object({
        material: z.enum(['grass', 'parking', 'water', 'sand', 'plaza', 'pitch', 'forest']),
    }),
});

/** Delete the targeted node. */
export const DeleteOp = z.object({
    action: z.literal('delete'),
    target: Target.default({ by: 'selected' }),
});

/**
 * CLARIFY — the model's escape hatch. When a request is ambiguous it should ask
 * instead of guessing. Having this in the schema is what lets the AI say "which
 * building?" rather than silently picking one.
 */
export const ClarifyOp = z.object({
    action: z.literal('clarify'),
    question: z.string().min(1),
});

export const ComposeObjectOp = z.object({
    action: z.literal('compose_object'),
    location: Location.default({ at: 'selection' }),
    parameters: ComposedObjectSchema,
});

export const AddPartsToSelectionOp = z.object({
    action: z.literal('add_parts_to_selection'),
    target: Target.default({ by: 'selected' }),
    parameters: z.object({
        parts: z.array(PartSchema).min(1).max(30),
    }),
});

// ── the union of everything the AI may emit ──────────────────────────

export const OperationSchema = z.discriminatedUnion('action', [
    ScatterTreesOp,
    AddBuildingOp,
    AddPathOp,
    SetBuildingHeightOp,
    RecolorBuildingOp,
    SetSurfaceMaterialOp,
    DeleteOp,
    ClarifyOp,
    ComposeObjectOp,
    AddPartsToSelectionOp,
]);

/** The AI returns a LIST of operations (one prompt can imply several steps). */
export const OperationListSchema = z.array(OperationSchema).min(1).max(20);

/** @typedef {z.infer<typeof OperationSchema>} Operation */

/*
 * Deferred until the matching generators exist — do NOT add to the union until the
 * app can actually execute them, or the AI will emit valid operations that no-op:
 *   - add_road / elevate_road (bridges, railings)
 *   - window styles, street lamps
 *   - set_season / restyle (theme-level changes)
 */