// src/render/fixtures.js

export const swimmingPool = {
    name: 'Lap Pool',
    parts: [
        { shape: 'box', position: [0, -0.1, 0], size: [27, 0.4, 14], color: '#D9D2C5', material: 'matte' },
        { shape: 'box', position: [0, -0.12, 0], size: [25, 0.36, 12], color: '#2E7FA8', material: 'water' },
        { shape: 'box', position: [0, 0.07, -3], size: [25, 0.02, 0.15], color: '#F0F0F0', material: 'matte' },
        { shape: 'box', position: [0, 0.07, 0], size: [25, 0.02, 0.15], color: '#F0F0F0', material: 'matte' },
        { shape: 'box', position: [0, 0.07, 3], size: [25, 0.02, 0.15], color: '#F0F0F0', material: 'matte' },
        { shape: 'cylinder', position: [12.2, 0.45, -1.2], radius: 0.04, height: 0.9, color: '#B8BCC0', material: 'metal' },
        { shape: 'cylinder', position: [12.2, 0.45, -0.6], radius: 0.04, height: 0.9, color: '#B8BCC0', material: 'metal' },
    ],
};

export const footballPitch = {
    name: 'Football Pitch',
    parts: [
        { shape: 'box', position: [0, 0.01, 0], size: [105, 0.02, 68], color: '#3C7A4B', material: 'matte' },
        { shape: 'box', position: [0, 0.03, 34], size: [105, 0.02, 0.12], color: '#F5F5F5', material: 'matte' },
        { shape: 'box', position: [0, 0.03, -34], size: [105, 0.02, 0.12], color: '#F5F5F5', material: 'matte' },
        { shape: 'box', position: [52.5, 0.03, 0], size: [0.12, 0.02, 68], color: '#F5F5F5', material: 'matte' },
        { shape: 'box', position: [-52.5, 0.03, 0], size: [0.12, 0.02, 68], color: '#F5F5F5', material: 'matte' },
        { shape: 'box', position: [0, 0.03, 0], size: [0.12, 0.02, 68], color: '#F5F5F5', material: 'matte' },
        { shape: 'cylinder', position: [0, 0.03, 0], radius: 0.3, height: 0.02, color: '#F5F5F5', material: 'matte' },
        { shape: 'box', position: [-44.25, 0.03, 20.16], size: [16.5, 0.02, 0.12], color: '#F5F5F5', material: 'matte' },
        { shape: 'box', position: [-44.25, 0.03, -20.16], size: [16.5, 0.02, 0.12], color: '#F5F5F5', material: 'matte' },
        { shape: 'box', position: [-36, 0.03, 0], size: [0.12, 0.02, 40.32], color: '#F5F5F5', material: 'matte' },
        { shape: 'box', position: [44.25, 0.03, 20.16], size: [16.5, 0.02, 0.12], color: '#F5F5F5', material: 'matte' },
        { shape: 'box', position: [44.25, 0.03, -20.16], size: [16.5, 0.02, 0.12], color: '#F5F5F5', material: 'matte' },
        { shape: 'box', position: [36, 0.03, 0], size: [0.12, 0.02, 40.32], color: '#F5F5F5', material: 'matte' },
        { shape: 'cylinder', position: [-52.5, 1.22, 3.66], radius: 0.06, height: 2.44, color: '#FFFFFF', material: 'glossy' },
        { shape: 'cylinder', position: [-52.5, 1.22, -3.66], radius: 0.06, height: 2.44, color: '#FFFFFF', material: 'glossy' },
        { shape: 'box', position: [-52.5, 2.44, 0], size: [0.12, 0.12, 7.32], color: '#FFFFFF', material: 'glossy' },
        { shape: 'cylinder', position: [52.5, 1.22, 3.66], radius: 0.06, height: 2.44, color: '#FFFFFF', material: 'glossy' },
        { shape: 'cylinder', position: [52.5, 1.22, -3.66], radius: 0.06, height: 2.44, color: '#FFFFFF', material: 'glossy' },
        { shape: 'box', position: [52.5, 2.44, 0], size: [0.12, 0.12, 7.32], color: '#FFFFFF', material: 'glossy' },
    ],
};

export const fountain = {
    name: 'Plaza Fountain',
    parts: [
        { shape: 'cylinder', position: [0, 0.3, 0], radius: 3.2, height: 0.6, color: '#C9C2B4', material: 'matte' },
        { shape: 'cylinder', position: [0, 0.32, 0], radius: 2.9, height: 0.5, color: '#3E8FA8', material: 'water' },
        { shape: 'cylinder', position: [0, 0.85, 0], radius: 0.45, height: 1.5, color: '#C9C2B4', material: 'matte' },
        { shape: 'cylinder', position: [0, 1.65, 0], radius: 1.1, height: 0.22, color: '#C9C2B4', material: 'matte' },
        { shape: 'cylinder', position: [0, 1.72, 0], radius: 0.95, height: 0.1, color: '#3E8FA8', material: 'water' },
        { shape: 'sphere', position: [0, 2.05, 0], radius: 0.28, color: '#8E9BA6', material: 'metal' },
    ],
};

export const parkBench = {
    name: 'Park Bench',
    parts: [
        { shape: 'box', position: [0, 0.45, 0], size: [1.8, 0.06, 0.45], color: '#8B6A45', material: 'matte' },
        { shape: 'box', position: [0, 0.72, -0.2], size: [1.8, 0.4, 0.05], color: '#8B6A45', material: 'matte' },
        { shape: 'box', position: [-0.78, 0.22, 0], size: [0.06, 0.45, 0.42], color: '#4A4A4A', material: 'metal' },
        { shape: 'box', position: [0.78, 0.22, 0], size: [0.06, 0.45, 0.42], color: '#4A4A4A', material: 'metal' },
    ],
};

export const fixtures = {
    swimmingPool,
    footballPitch,
    fountain,
    parkBench,
};
