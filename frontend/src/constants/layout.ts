/**
 * Layout, sizing, and positioning constants
 */

/** Percentage of viewport width for game area on desktop (0.90 = 90%) */
export const GAME_WIDTH_PERCENT = 0.90;

/** Viewport width breakpoint for mobile/desktop detection (pixels) */
export const MOBILE_BREAKPOINT_PX = 768;

/** Board padding on mobile devices (pixels) */
export const BOARD_PADDING_MOBILE_PX = 10;

/** Board padding on desktop devices (pixels) */
export const BOARD_PADDING_DESKTOP_PX = 20;

/** Gap between cards in pixels */
export const CARD_GAP_PX = 10;

/** Minimum card width in pixels (prevents cards from becoming too small) */
export const CARD_MIN_WIDTH_PX = 60;

/** Card aspect ratio (width:height = 5:7) */
export const CARD_ASPECT_RATIO = 1.4; // height = width * 1.4

/** Default card width for fallback calculations (pixels) */
export const CARD_DEFAULT_WIDTH_PX = 100;

/** Default card height for fallback calculations (pixels) */
export const CARD_DEFAULT_HEIGHT_PX = 140;

/**
 * Card overlap ratios
 * 0 = no overlap, 1 = 100% overlap (only 0% visible)
 */

/** Tableau card overlap ratio (0.75 = 75% overlap, 25% visible) */
export const TABLEAU_CARD_OVERLAP_RATIO = 0.75;

/** Visible portion of overlapped tableau cards (1 - overlap ratio) */
export const TABLEAU_CARD_VISIBLE_RATIO = 1 - TABLEAU_CARD_OVERLAP_RATIO; // 0.25

/** Drag overlay card spacing ratio (for multi-card sequences) */
export const DRAG_OVERLAY_SPACING_RATIO = 0.25;

/** Transform origin for drag overlay centering */
export const DRAG_OVERLAY_TRANSFORM = 'translate(-50%, -50%)';

/** Initial transform state (no translation) */
export const INITIAL_TRANSFORM = 'translate(0, 0)';
