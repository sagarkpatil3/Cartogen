import { theme } from '../render/theme.js';
import { pointInPolygon } from '../lib/geometry.js';

export function addBuilding({
    name = 'New Building',
    height = 18,
    floors,
    windowStyle = 'vertical',
    kind = 'commercial',
    center = [0, 0],
    width = 24,
    depth = 18,
    wallColor,
    roofColor,
    glazingRatio,
    bayWidth,
} = {}) {
    const [cx, cz] = center;
    const hw = width / 2;
    const hd = depth / 2;
    // Closed 4-corner rectangle footprint ring (last point == first point)
    const footprint = [
        [cx - hw, cz - hd],
        [cx + hw, cz - hd],
        [cx + hw, cz + hd],
        [cx - hw, cz + hd],
        [cx - hw, cz - hd],
    ];
    const calculatedFloors = floors ?? Math.max(1, Math.round(height / 3.2));
    const id = `bldg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return [{
        id,
        type: 'building',
        name,
        kind,
        height,
        floors: calculatedFloors,
        windowStyle,
        glazingRatio,
        bayWidth,
        hasEntrance: true,
        hasRoofPenthouse: height > 12,
        showLedges: calculatedFloors > 1,
        showLabel: true,
        wallColor,
        roofColor,
        footprint,
    }];
}