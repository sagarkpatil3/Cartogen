// src/ops/part-schema.js
import { z } from 'zod';

const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

// [x, y, z] in meters, relative to object center.
// y is UP. Position refers to the CENTER of the shape.
const Vec3 = z.tuple([
    z.coerce.number(),
    z.coerce.number(),
    z.coerce.number(),
]);

const BasePart = z.object({
    position: Vec3,
    rotationY: z.coerce.number().default(0), // degrees
    color: HexColor,
    material: z
        .enum(['matte', 'glossy', 'metal', 'glass', 'water'])
        .default('matte'),
});

const BoxPart = BasePart.extend({
    shape: z.literal('box'),
    size: Vec3, // [width, height, depth]
});

const CylinderPart = BasePart.extend({
    shape: z.literal('cylinder'),
    radius: z.coerce.number().positive(),
    height: z.coerce.number().positive(),
});

const SpherePart = BasePart.extend({
    shape: z.literal('sphere'),
    radius: z.coerce.number().positive(),
});

const WedgePart = BasePart.extend({
    shape: z.literal('wedge'),
    size: Vec3, // [width (x), height (y), depth (z)]
});

export const PartSchema = z.discriminatedUnion('shape', [
    BoxPart,
    CylinderPart,
    SpherePart,
    WedgePart,
]);

export const ComposedObjectSchema = z.object({
    name: z.string(),
    parts: z.array(PartSchema).min(1).max(60),
});
