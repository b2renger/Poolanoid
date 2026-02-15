export const CONFIG = {
    // Game Rules
    GAME: {
        BASE_WALL_COUNT: 10,
        WALLS_PER_LEVEL: 5,
        BASE_SHOTS: 5,
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

        BALL_RADIUS: 0.17,
        BALL_SEGMENTS: 16,

        BOUNDARY_WALL_THICKNESS: 0.1,

        WALL_SPAWN_WIDTH: 8,
        WALL_SPAWN_DEPTH: 3
    },

    // Camera & Rendering
    CAMERA: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        POSITION_Y: 12,
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
        WALL_FADE_DURATION: 100,
        IMPACT_DURATION: 20,
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

    // Level-scaled wall spawn rates
    //
    // HOW IT WORKS:
    //   Each tier applies to levels 1..maxLevel (first matching tier wins).
    //   `threshold` values are CUMULATIVE (0→1). A random roll in [0,1) picks
    //   the first entry where roll < threshold.
    //
    //   Individual chance = threshold − previous threshold (or 0 for the first).
    //   The last entry (normal) must always have threshold: 1.00 to catch the rest.
    //
    // EXAMPLE — to give extraBounce 15% and lowBounce 10%:
    //   { threshold: 0.15, type: 'extraBounce' },   // 15%  (0.15 − 0.00)
    //   { threshold: 0.25, type: 'lowBounce' },      // 10%  (0.25 − 0.15)
    //   { threshold: 1.00, type: 'normal' },          // 75%  (1.00 − 0.25)
    //
    // WALL TYPES:
    //   Behavior walls (scored, see WALL_BEHAVIORS for colors):
    //     normal      — standard wall, no velocity effect
    //     extraBounce — ball speed ×1.25 on hit
    //     lowBounce   — ball speed ×0.25 on hit
    //     sticky      — stops the ball completely on hit
    //   Power-up walls (not scored, see POWERUPS for colors):
    //     extraShot   — grants +1 shot
    //     bomb        — destroys nearby walls in radius
    //     multiBall   — spawns extra balls
    //
    WALL_SPAWN_RATES: [
        {
            maxLevel: 2,  // Levels 1–2: introductory, behavior walls only
            types: [
                { threshold: 0.10, type: 'extraBounce' },  // 10%
                { threshold: 0.20, type: 'lowBounce' },    // 10%
                { threshold: 1.00, type: 'normal' },       // 80%
            ]
        },
        {
            maxLevel: 4,  // Levels 3–4: introduce sticky + bomb
            types: [
                { threshold: 0.15, type: 'extraBounce' },  // 15%
                { threshold: 0.30, type: 'lowBounce' },    // 15%
                { threshold: 0.45, type: 'sticky' },       // 15%
                { threshold: 0.55, type: 'bomb' },         // 10%
                { threshold: 1.00, type: 'normal' },       // 45%
            ]
        },
        {
            maxLevel: 6,  // Levels 5–6: add extraShot + multiBall
            types: [
                { threshold: 0.15, type: 'extraBounce' },  // 15%
                { threshold: 0.30, type: 'lowBounce' },    // 15%
                { threshold: 0.42, type: 'sticky' },       // 12%
                { threshold: 0.50, type: 'extraShot' },    //  8%
                { threshold: 0.58, type: 'bomb' },         //  8%
                { threshold: 0.62, type: 'multiBall' },    //  4%
                { threshold: 1.00, type: 'normal' },       // 38%
            ]
        },
        {
            maxLevel: Infinity,  // Levels 7+: full variety, fewer normals
            types: [
                { threshold: 0.12, type: 'extraBounce' },  // 12%
                { threshold: 0.24, type: 'lowBounce' },    // 12%
                { threshold: 0.32, type: 'sticky' },       //  8%
                { threshold: 0.38, type: 'extraShot' },    //  6%
                { threshold: 0.44, type: 'bomb' },         //  6%
                { threshold: 0.48, type: 'multiBall' },    //  4%
                { threshold: 1.00, type: 'normal' },       // 52%
            ]
        },
    ],

    // Scoring
    SCORING: {
        POINTS: {
            normal: 1,
            extraBounce: 1,
            lowBounce: 1,
            sticky: 4,
        },
    },

    // Combo system
    COMBO: {
        SETTLE_DELAY: 500,
        THRESHOLDS: [
            { min: 3, points: 2,  shots: 0, color: '#E4FF30' },
            { min: 4, points: 5,  shots: 1, color: '#E4FF30' },
            { min: 6, points: 10, shots: 1, color: '#008BFF' },
            { min: 8, points: 20, shots: 2, color: '#FF5FCF' },
        ],
    },

    // Screen shake
    SHAKE: {
        BASE_INTENSITY: 0.008,
        COMBO_INTENSITY: 0.003,
        MAX_INTENSITY: 0.03,
        DECAY: 14,
    },

    // Slow-motion
    SLOW_MO: {
        MIN_COMBO: 5,
        TIME_SCALE: 0.5,
        DURATION: 500,
    },

    // Level complete zoom
    LEVEL_ZOOM: {
        DIP: 1,
        DIP_DURATION: 300,
        HOLD_DURATION: 200,
        RETURN_DURATION: 300,
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
        BALL_SHININESS: 500,
        BALL_EMISSIVE_INTENSITY: 10.58,
        WALL_SHININESS: 100
    },

    // Quality / Device Detection
    QUALITY: {
        MOBILE_MAX_PIXEL_RATIO: 1.5,
        LOW_END_CORE_THRESHOLD: 4,
        LOW_END_MEMORY_THRESHOLD: 4
    }
};
