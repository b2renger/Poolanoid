export const CONFIG = {
    // Game Rules
    GAME: {
        BASE_WALL_COUNT: 10,
        WALLS_PER_LEVEL: 5,
        BASE_SHOTS: 6,
        EXTRA_SHOTS_PER_LEVEL: 1
    },

    // Colors (hex numbers for Three.js, strings for CSS)
    COLORS: {
        BACKGROUND: 0x362F4F,
        BACKGROUND_CSS: '#362F4F',
        TABLE: 0x008BFF,
        BALL: 0xFFD700,
        AIM_LINE: 0xE4FF30,
        UI_TEXT: '#E4FF30',
        IMPACT_RING: 0x008BFF,
        GAME_OVER_BG: 'rgba(54, 47, 79, 0.92)',
        BUTTON_PRIMARY: '#008BFF',
        BUTTON_HOVER: '#FF5FCF',
        BUTTON_TEXT: '#362F4F',
        FPS_COLOR: '#0f0'
    },

    // Physics Engine
    PHYSICS: {
        GRAVITY: -9.82,
        DT: 1 / 60,
        MIN_STEP_DT: 1 / 240,
        MAX_SUBSTEPS: 30,
        BULLET_SAFE_DISTANCE: 0.04,
        MAX_FRAME_DELTA: 0.1,
        SOLVER_ITERATIONS: 16,
        DEFAULT_FRICTION: 0.15,
        DEFAULT_RESTITUTION: 0.35,

        BALL_MASS: 1,
        BALL_LINEAR_DAMPING: 0.38,
        BALL_ANGULAR_DAMPING: 0.35,
        BALL_SLEEP_SPEED_LIMIT: 0.1,
        BALL_SLEEP_TIME_LIMIT: 0.5,

        BALL_TABLE_FRICTION: 0.42,
        BALL_TABLE_RESTITUTION: 0.12,

        BALL_CUSHION_FRICTION: 0.02,
        BALL_CUSHION_RESTITUTION: 0.80,
    },

    // Dimensions (world units)
    DIMENSIONS: {
        TABLE_WIDTH: 10,
        TABLE_HEIGHT: 0.1,
        TABLE_DEPTH: 5,

        WALL_WIDTH: 3,
        WALL_HEIGHT: 0.5,
        WALL_THICKNESS: 0.12,

        BALL_RADIUS: 0.15,
        BALL_SEGMENTS: 32,

        BOUNDARY_WALL_THICKNESS: 0.1,

        WALL_SPAWN_WIDTH: 8,
        WALL_SPAWN_DEPTH: 3
    },

    // Camera & Rendering
    CAMERA: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        POSITION_Y: 6,
        FOG_NEAR: 8,
        FOG_FAR: 22,
        ORBIT_DAMPING: 0.05
    },

    // Aiming Mechanics
    AIMING: {
        MAX_IMPULSE: 50,
        IMPULSE_MULTIPLIER: 4,
        TOUCH_HIT_RADIUS: 0.8,
        MOUSE_HIT_RADIUS: 0.15,
        AIM_LINE_MAX_LENGTH: 4,
        AIM_LINE_FADE_LEVEL: 10,
    },

    // Visual Effects
    EFFECTS: {
        WALL_FADE_DURATION: 200,
        IMPACT_DURATION: 120,
        IMPACT_RING_INNER_RADIUS: 0.05,
        IMPACT_RING_OUTER_RADIUS: 0.22,
        IMPACT_RING_SEGMENTS: 12,
        IMPACT_RING_OPACITY: 0.4,
        IMPACT_SCALE_START: 0.01,
        IMPACT_SCALE_RANGE: 0.9,
        NEXT_LEVEL_DELAY: 1000
    },

    // Wall behavior types (velocity effects applied in code; restitution uniform)
    WALL_BEHAVIORS: {
        normal:      { color: 0x00FF9C, restitution: 0.82, friction: 0.02 },
        extraBounce: { color: 0xFF5FCF, restitution: 0.82, friction: 0.02 },
        sticky:      { color: 0xFFAA00, restitution: 0.82, friction: 0.02 },
        lowBounce:   { color: 0xE4FF30, restitution: 0.82, friction: 0.02 },
    },

    // Power-up walls (trigger effect when destroyed)
    POWERUPS: {
        extraShot: { color: 0x00FFFF, label: '+1 Shot!', shots: 1 },
        bomb:      { color: 0xFF0000, label: 'BOOM!', radius: 1.5 },
        multiBall: { color: 0x00BFFF, label: 'Multi-Ball!', count: 2 },
    },

    // Level-scaled wall spawn rates (cumulative probability thresholds)
    WALL_SPAWN_RATES: [
        {
            maxLevel: 2,
            types: [
                { threshold: 0.10, type: 'extraBounce' },
                { threshold: 0.20, type: 'lowBounce' },
                { threshold: 1.00, type: 'normal' },
            ]
        },
        {
            maxLevel: 5,
            types: [
                { threshold: 0.10, type: 'extraBounce' },
                { threshold: 0.20, type: 'lowBounce' },
                { threshold: 0.25, type: 'sticky' },
                { threshold: 0.29, type: 'extraShot' },
                { threshold: 0.33, type: 'bomb' },
                { threshold: 0.34, type: 'multiBall' },
                { threshold: 1.00, type: 'normal' },
            ]
        },
        {
            maxLevel: Infinity,
            types: [
                { threshold: 0.12, type: 'extraBounce' },
                { threshold: 0.24, type: 'lowBounce' },
                { threshold: 0.32, type: 'sticky' },
                { threshold: 0.38, type: 'extraShot' },
                { threshold: 0.44, type: 'bomb' },
                { threshold: 0.48, type: 'multiBall' },
                { threshold: 1.00, type: 'normal' },
            ]
        },
    ],

    // Scoring
    SCORING: {
        POINTS: {
            normal: 1,
            extraBounce: 1,
            lowBounce: 1,
            sticky: 2,
        },
        COMBO_WINDOW: 1500,
        COMBO_BONUS: [0, 0, 1, 2, 3, 5],
    },

    // Multi-ball power-up
    MULTI_BALL: {
        IMPULSE_FACTOR: 0.6,
        SPREAD_ANGLE: Math.PI * 2 / 3,
        TIMEOUT: 8000,
    },

    // Floating text effect
    FLOATING_TEXT: {
        DURATION: 1500,
        RISE_SPEED: 1.2,
        FONT_SIZE: 64,
        CANVAS_SIZE: 256,
    },

    // Lighting
    LIGHTING: {
        AMBIENT_COLOR: 0xffffff,
        AMBIENT_INTENSITY: 0.58,
        MAIN_COLOR: 0xffffff,
        MAIN_INTENSITY: 1.1,
        MAIN_POSITION: { x: 0, y: 8, z: 0 },
        SHADOW_MAP_SIZE: 2048,
        SHADOW_NEAR: 0.5,
        SHADOW_FAR: 20,
        SHADOW_LEFT: -6,
        SHADOW_RIGHT: 6,
        SHADOW_TOP: 4,
        SHADOW_BOTTOM: -4,
        SHADOW_BIAS: -0.0002,
        FILL_COLOR: 0xffffff,
        FILL_INTENSITY: 0.3,
        FILL_POSITION: { x: 4, y: 3, z: 2 },
        RIM_COLOR: 0xa0c8ff,
        RIM_INTENSITY: 0.2,
        RIM_POSITION: { x: -3, y: 2, z: -2 }
    },

    // Material Properties
    MATERIALS: {
        BALL_SHININESS: 100,
        BALL_EMISSIVE_INTENSITY: 0.18,
        WALL_SHININESS: 100
    },

    // Quality / Device Detection
    QUALITY: {
        MOBILE_MAX_PIXEL_RATIO: 1.5,
        LOW_END_CORE_THRESHOLD: 4,
        LOW_END_MEMORY_THRESHOLD: 4
    }
};
