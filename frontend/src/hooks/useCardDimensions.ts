import { useEffect } from 'react';
import type { RefObject } from 'react';
import {
    GAME_WIDTH_PERCENT,
    MOBILE_BREAKPOINT_PX,
    BOARD_PADDING_MOBILE_PX,
    BOARD_PADDING_DESKTOP_PX,
    CARD_GAP_PX,
    CARD_MIN_WIDTH_PX,
    CARD_ASPECT_RATIO,
    TABLEAU_COLUMNS_ONE_DECK,
    TABLEAU_COLUMNS_TWO_DECK,
    SEQUENTIAL_RANK_DIFFERENCE,
    DECK_ONE,
} from '../constants';

export function useCardDimensions(
    deckCount: 1 | 2,
    gameBoardRef: RefObject<HTMLDivElement | null>,
    gameAreaRef: RefObject<HTMLDivElement | null>
) {
    // Calculate and set card dimensions based on game area width
    useEffect(() => {
        const calculateCardDimensions = () => {
            if (!gameBoardRef.current || !gameAreaRef.current) return;

            const boardPadding = window.innerWidth < MOBILE_BREAKPOINT_PX ? BOARD_PADDING_MOBILE_PX : BOARD_PADDING_DESKTOP_PX;

            // Desktop game width: Change this value to adjust game width (0.6 = 60%, 0.7 = 70%, 0.8 = 80%)
            const gameWidthPercent = GAME_WIDTH_PERCENT;

            const viewportWidth = window.innerWidth - (boardPadding * 2);
            const availableWidth = viewportWidth * gameWidthPercent;

            // Gap between cards
            const cardGap = CARD_GAP_PX;

            // Tableau: 7 columns for 1 deck, 9 columns for 2 decks
            const tableauItems = deckCount === DECK_ONE ? TABLEAU_COLUMNS_ONE_DECK : TABLEAU_COLUMNS_TWO_DECK;
            const tableauGaps = tableauItems - SEQUENTIAL_RANK_DIFFERENCE;

            // Calculate card width to fill available space
            let cardWidth = (availableWidth - (tableauGaps * cardGap)) / tableauItems;

            // Set reasonable bounds (minimum 60px)
            const minWidth = CARD_MIN_WIDTH_PX;
            cardWidth = Math.max(minWidth, cardWidth);

            // Maintain 5:7 aspect ratio (width:height)
            const cardHeight = cardWidth * CARD_ASPECT_RATIO;

            // Set CSS custom properties
            gameBoardRef.current.style.setProperty('--card-width', `${cardWidth}px`);
            gameBoardRef.current.style.setProperty('--card-height', `${cardHeight}px`);
            gameBoardRef.current.style.setProperty('--card-gap', `${cardGap}px`);
            gameBoardRef.current.style.setProperty('--board-padding', `${boardPadding}px`);
            gameBoardRef.current.style.setProperty('--max-game-width', `${gameWidthPercent * 100}%`);
        };

        calculateCardDimensions();

        // Recalculate on window resize
        const handleResize = () => {
            calculateCardDimensions();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [deckCount, gameBoardRef, gameAreaRef]);
}
