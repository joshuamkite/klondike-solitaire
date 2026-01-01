/**
 * Animation timing and transition constants
 */

/** Duration for card movement animations in milliseconds */
export const CARD_ANIMATION_DURATION_MS = 300;

/** Delay between auto-play card moves in milliseconds */
export const AUTO_PLAY_DELAY_MS = 700;

/** Delay for auto-complete actions in milliseconds */
export const AUTO_COMPLETE_DELAY_MS = 300;

/** Easing function for smooth card animations */
export const ANIMATION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** Z-index for animated cards flying across screen */
export const ANIMATED_CARD_Z_INDEX = 1000;

/** Z-index for drag overlay (must be above everything) */
export const DRAG_OVERLAY_Z_INDEX = 10000;

/**
 * Victory animation particle constants
 */

/** Number of particles to create in victory animation */
export const VICTORY_PARTICLE_COUNT = 60;

/** Suit symbols for victory particles */
export const VICTORY_PARTICLE_SUITS = ['♥', '♦', '♣', '♠'] as const;

/** Circle angle in degrees */
export const FULL_CIRCLE_DEGREES = 360;

/** Random angle variation for particles (±degrees) */
export const VICTORY_ANGLE_RANDOMNESS_DEGREES = 20;

/** Angle offset for randomness calculation */
export const VICTORY_ANGLE_OFFSET_DEGREES = 10;

/** Base velocity for particles in pixels */
export const VICTORY_VELOCITY_BASE_PX = 300;

/** Random additional velocity for particles in pixels */
export const VICTORY_VELOCITY_RANDOM_PX = 400;

/** Maximum rotation range for particles in degrees */
export const VICTORY_ROTATION_RANGE_DEGREES = 720;

/** Rotation offset for centering rotation range */
export const VICTORY_ROTATION_OFFSET_DEGREES = 360;

/** Maximum stagger delay for particle bursts in seconds */
export const VICTORY_DELAY_MAX_SECONDS = 0.3;

/** Number of suits in a deck (for modulo calculations) */
export const SUIT_MODULO = 4;

/** Degrees to radians conversion factor */
export const DEGREES_TO_RADIANS = Math.PI / 180;
