// src/lib/serialize-context.js

/**
 * Serializes the currently selected node into a compact text format
 * for the AI model to understand the target scene object.
 *
 * @param {object|null} selectedNode
 * @returns {string}
 */
export function serializeSelectedNode(selectedNode) {
    if (!selectedNode) {
        return 'NO OBJECT SELECTED. Any action will create new objects at the target position.';
    }

    const { id, type, name, height, floors, position, parts } = selectedNode;
    const displayName = name || `${type} #${id.slice(-4)}`;

    if (type === 'building') {
        const h = height || 18;
        const fl = floors || Math.round(h / 3.2);
        return `SELECTED OBJECT: "${displayName}" (type: building)
- Dimensions: Height ${h}m, ${fl} floors.
- Center position: [${position ? position.join(', ') : '0, 0'}].
- Note: Standard building volume. Can receive height changes, color updates, or new parts added on top.`;
    }

    if (type === 'composed') {
        const [cx, cz] = position || [0, 0];
        const partList = parts || [];
        
        let maxY = 0;
        const summaryParts = partList.map((p, i) => {
            const [px, py, pz] = p.position || [0, 0, 0];
            maxY = Math.max(maxY, py);
            return `  [part ${i + 1}] shape: ${p.shape}, pos: [${px}, ${py}, ${pz}], color: ${p.color}, mat: ${p.material || 'matte'}`;
        });

        return `SELECTED OBJECT: "${displayName}" (type: composed)
- Position: [${cx}, ${cz}]. Highest point: ~${maxY.toFixed(2)}m. Total parts: ${partList.length}.
- Existing Parts Breakdown:
${summaryParts.join('\n')}`;
    }

    return `SELECTED OBJECT: "${displayName}" (type: ${type}). Position: [${position ? position.join(', ') : '0, 0'}].`;
}
