import * as THREE from 'three';

/**
 * Subdivides a wall face into window rectangles.
 *
 * Coordinates are face-local 2D: origin at bottom-left of the face,
 * u increases along the wall, v increases upward. The caller maps
 * these onto the correct 3D face.
 */

// Windows narrower or shorter than this aren't worth rendering.
const MIN_WINDOW_SIZE = 0.3;

export function splitFacade({
    faceWidth,
    faceHeight,
    floors,
    bayWidth,
    glazingRatio,
}) {
    if (faceWidth <= 0 || faceHeight <= 0 || floors < 1) return [];

    const floorHeight = faceHeight / floors;

    // Fit a whole number of bays across the face, then use the
    // resulting width rather than the requested one. This is why
    // bayWidth is a *target*, not a guarantee — windows must stay
    // evenly spaced, so the face width wins.
    const bayCount = Math.max(1, Math.round(faceWidth / bayWidth));
    const actualBayWidth = faceWidth / bayCount;

    // glazingRatio is linear, not area: 0.7 means the window spans
    // 70% of the cell's width and 70% of its height.
    const windowWidth = actualBayWidth * glazingRatio;
    const windowHeight = floorHeight * glazingRatio;

    if (windowWidth < MIN_WINDOW_SIZE || windowHeight < MIN_WINDOW_SIZE) {
        return [];
    }

    // Leftover space in each cell, split evenly to center the window.
    const insetU = (actualBayWidth - windowWidth) / 2;
    const insetV = (floorHeight - windowHeight) / 2;

    const windows = [];

    for (let floor = 0; floor < floors; floor++) {
        const cellV = floor * floorHeight;

        for (let bay = 0; bay < bayCount; bay++) {
            const cellU = bay * actualBayWidth;

            windows.push({
                u: cellU + insetU,
                v: cellV + insetV,
                width: windowWidth,
                height: windowHeight,
            });
        }
    }

    return windows;
}

/**
 * Maps 2D facade windows to 3D buffer geometry for an entire building footprint ring.
 * @param {[number, number][]} ring
 * @param {number} height
 * @param {number} floors
 * @param {number} bayWidth
 * @param {number} glazingRatio
 * @returns {THREE.BufferGeometry | null}
 */
export function generateParametricFacadeGeometry(ring, height, floors, bayWidth = 4, glazingRatio = 0.65) {
    if (!ring || ring.length < 3 || height <= 0 || floors < 1) return null;

    const positions = [];
    const normalOffset = 0.08;

    for (let i = 0; i < ring.length - 1; i++) {
        const [ax, az] = ring[i];
        const [bx, bz] = ring[i + 1];
        let dx = bx - ax;
        let dz = bz - az;
        const segLen = Math.hypot(dx, dz);
        if (segLen < 1) continue;

        dx /= segLen;
        dz /= segLen;
        const nx = -dz * normalOffset;
        const nz = dx * normalOffset;

        const windows = splitFacade({
            faceWidth: segLen,
            faceHeight: height,
            floors,
            bayWidth,
            glazingRatio,
        });

        for (const w of windows) {
            const u1 = w.u;
            const u2 = w.u + w.width;
            const v1 = w.v;
            const v2 = w.v + w.height;

            const x1 = ax + dx * u1 + nx;
            const z1 = az + dz * u1 + nz;
            const x2 = ax + dx * u2 + nx;
            const z2 = az + dz * u2 + nz;

            // Triangle 1
            positions.push(
                x1, v1, z1,
                x2, v1, z2,
                x2, v2, z2
            );

            // Triangle 2
            positions.push(
                x1, v1, z1,
                x2, v2, z2,
                x1, v2, z1
            );
        }
    }

    if (positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
}