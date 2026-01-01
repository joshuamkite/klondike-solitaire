/**
 * Klondike Solitaire game rules and logic constants
 */

/** Number of cards in a standard playing card deck */
export const CARDS_PER_DECK = 52;

/** Number of suits in a standard deck */
export const SUIT_COUNT = 4;

/** Number of ranks in a standard deck */
export const RANK_COUNT = 13;

/**
 * Tableau (main play area) configuration
 */

/** Number of tableau columns for 1-deck mode */
export const TABLEAU_COLUMNS_ONE_DECK = 7;

/** Number of tableau columns for 2-deck mode */
export const TABLEAU_COLUMNS_TWO_DECK = 9;

/**
 * Foundation (goal piles) configuration
 */

/** Number of foundations for 1-deck mode (one per suit) */
export const FOUNDATIONS_ONE_DECK = 4;

/** Number of foundations for 2-deck mode (two per suit) */
export const FOUNDATIONS_TWO_DECK = 8;

/** Number of cards required in each foundation to win */
export const CARDS_PER_FOUNDATION_TO_WIN = 13;

/**
 * Foundation suit order (HCDS pattern)
 */
export const FOUNDATION_SUIT_ORDER = ['hearts', 'clubs', 'diamonds', 'spades'] as const;

/** Offset for second row of foundations in 2-deck mode */
export const FOUNDATION_SECOND_ROW_OFFSET = 4;

/**
 * Auto-play safety thresholds (FreeCell-style conservative strategy)
 */

/** Rank value below which cards are always safe to auto-move (Aces and 2s) */
export const AUTO_PLAY_ALWAYS_SAFE_RANK = 2;

/** Rank difference threshold for safe auto-move (opposite color must be 2+ ranks behind) */
export const AUTO_PLAY_RANK_SAFETY_MARGIN = 2;

/**
 * Sentinel values
 */

/** Sentinel value for "king + 1" (used in min foundation rank calculations) */
export const KING_PLUS_ONE_SENTINEL = 14;

/** Index value indicating "not found" */
export const NOT_FOUND_INDEX = -1;

/**
 * Game state initial values
 */

/** Initial move count for new game */
export const INITIAL_MOVE_COUNT = 0;

/** Index offset to convert array length to last index (length - 1) */
export const LAST_INDEX_OFFSET = 1;

/** Rank difference for sequential cards (descending or ascending) */
export const SEQUENTIAL_RANK_DIFFERENCE = 1;

/**
 * Deck configuration
 */

/** First deck number */
export const DECK_ONE = 1 as const;

/** Second deck number */
export const DECK_TWO = 2 as const;

/**
 * Drag and drop
 */

/** Base64 transparent 1x1 pixel GIF for custom drag image */
export const TRANSPARENT_PIXEL_DATA_URI = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** Coordinates indicating invalid drag position */
export const INVALID_DRAG_COORDINATE = 0;
