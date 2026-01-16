import { useState } from 'react';
import type { Card as CardType } from '../types/card';
import type { GameState } from '../types/gameState';
import { moveCards } from '../game/klondikeLogic';
import { TABLEAU_CARD_VISIBLE_RATIO } from '../constants';

interface AnimatingCardsState {
    cards: CardType[];
    startPos: { x: number; y: number };
    endPos: { x: number; y: number };
    onComplete: () => void;
}

export function useCardAnimation(
    gameState: GameState,
    updateGameStateImmediate: (newState: GameState, skipAutoPlay?: boolean) => void,
    cardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>,
    foundationRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
    tableauRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
) {
    const [animatingCards, setAnimatingCards] = useState<AnimatingCardsState | null>(null);

    // Helper function to get card element position using refs
    const getCardPosition = (cardId: string): { x: number; y: number } | null => {
        const element = cardRefs.current.get(cardId);
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top
        };
    };

    // Helper to get the destination element position using refs (uses current DOM state, not future state)
    // Accepts pre-computed cardHeight to avoid repeated getComputedStyle calls
    const getDestinationPosition = (
        toPile: 'tableau' | 'foundation',
        toIndex: number,
        cardHeight: number
    ): { x: number; y: number } | null => {
        if (toPile === 'foundation') {
            // Find the foundation cell using ref
            const targetCell = foundationRefs.current[toIndex];
            if (!targetCell) return null;

            const rect = targetCell.getBoundingClientRect();
            return { x: rect.left, y: rect.top };
        } else {
            // Tableau column - find the current last card in the column
            const targetColumn = tableauRefs.current[toIndex];
            if (!targetColumn) return null;

            // Get the current state's tableau column to find cards
            const column = gameState.tableau[toIndex];

            if (column.length > 0) {
                // Get the last card's ID and find its position
                const lastCard = column[column.length - 1];
                const lastCardElement = cardRefs.current.get(lastCard.id);

                if (lastCardElement) {
                    const rect = lastCardElement.getBoundingClientRect();

                    // Calculate the position for the new card (below the last one)
                    return {
                        x: rect.left,
                        y: rect.top + cardHeight * TABLEAU_CARD_VISIBLE_RATIO // 75% overlap means 25% visible
                    };
                }
            }

            // Empty column - get the column's position (placeholder)
            const rect = targetColumn.getBoundingClientRect();
            return { x: rect.left, y: rect.top };
        }
    };

    // Perform an animated move
    const animateMove = (
        fromPile: 'tableau' | 'waste' | 'foundation',
        fromIndex: number,
        cardIndex: number,
        toPile: 'tableau' | 'foundation',
        toIndex: number,
        onAnimationComplete?: () => void,
        sourceState?: GameState  // Optional source state for auto-play
    ) => {
        const stateToUse = sourceState || gameState;

        // Get the cards being moved
        let cardsToMove: CardType[];
        let firstCardId: string;

        if (fromPile === 'waste') {
            cardsToMove = [stateToUse.waste[stateToUse.waste.length - 1]];
            firstCardId = cardsToMove[0].id;
        } else if (fromPile === 'foundation') {
            const foundation = stateToUse.foundations[fromIndex];
            cardsToMove = [foundation[foundation.length - 1]];
            firstCardId = cardsToMove[0].id;
        } else {
            // Tableau - might be moving multiple cards
            const column = stateToUse.tableau[fromIndex];
            cardsToMove = column.slice(cardIndex);
            firstCardId = cardsToMove[0].id;
        }

        // Batch all DOM reads together to avoid layout thrashing
        const startPos = getCardPosition(firstCardId);
        const cardHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-height') || '140');
        const endPos = getDestinationPosition(toPile, toIndex, cardHeight);

        if (!startPos || !endPos) {
            // Can't animate - just do the move immediately
            const newState = moveCards(stateToUse, fromPile, fromIndex, cardIndex, toPile, toIndex);
            if (newState) {
                updateGameStateImmediate(newState);
            }
            onAnimationComplete?.();
            return;
        }

        // Perform the move to get the new state
        const newState = moveCards(stateToUse, fromPile, fromIndex, cardIndex, toPile, toIndex);
        if (!newState) {
            onAnimationComplete?.();
            return; // Invalid move
        }

        // Start the animation
        setAnimatingCards({
            cards: cardsToMove,
            startPos,
            endPos,
            onComplete: () => {
                setAnimatingCards(null);
                updateGameStateImmediate(newState);
                onAnimationComplete?.();
            }
        });
    };

    // Helper to detect which card moved between states
    const detectAutoPlayMove = (oldState: GameState, newState: GameState): {
        fromPile: 'tableau' | 'waste';
        fromIndex: number;
        cardIndex: number;
        toPile: 'foundation';
        toIndex: number;
    } | null => {
        // Check waste pile
        if (oldState.waste.length > newState.waste.length) {
            const movedCard = oldState.waste[oldState.waste.length - 1];
            // Find which foundation gained a card
            for (let i = 0; i < newState.foundations.length; i++) {
                if (newState.foundations[i].length > oldState.foundations[i].length) {
                    const addedCard = newState.foundations[i][newState.foundations[i].length - 1];
                    if (addedCard.id === movedCard.id) {
                        return {
                            fromPile: 'waste',
                            fromIndex: 0,
                            cardIndex: oldState.waste.length - 1,
                            toPile: 'foundation',
                            toIndex: i
                        };
                    }
                }
            }
        }

        // Check tableau columns
        for (let col = 0; col < oldState.tableau.length; col++) {
            const oldColumn = oldState.tableau[col];
            const newColumn = newState.tableau[col];

            if (oldColumn.length > newColumn.length) {
                const movedCard = oldColumn[oldColumn.length - 1];
                // Find which foundation gained this card
                for (let i = 0; i < newState.foundations.length; i++) {
                    if (newState.foundations[i].length > oldState.foundations[i].length) {
                        const addedCard = newState.foundations[i][newState.foundations[i].length - 1];
                        if (addedCard.id === movedCard.id) {
                            return {
                                fromPile: 'tableau',
                                fromIndex: col,
                                cardIndex: oldColumn.length - 1,
                                toPile: 'foundation',
                                toIndex: i
                            };
                        }
                    }
                }
            }
        }

        return null;
    };

    return {
        animatingCards,
        animateMove,
        detectAutoPlayMove,
    };
}
