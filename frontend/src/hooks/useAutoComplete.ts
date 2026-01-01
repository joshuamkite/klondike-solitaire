import { useEffect, useRef } from 'react';
import type { GameState } from '../types/gameState';
import { getNextAutoCompleteAction, allTableauCardsFaceUp } from '../game/klondikeLogic';
import { AUTO_COMPLETE_DELAY_MS } from '../constants';

export function useAutoComplete(
    gameState: GameState,
    animateMove: (
        fromPile: 'tableau' | 'waste' | 'foundation',
        fromIndex: number,
        cardIndex: number,
        toPile: 'tableau' | 'foundation',
        toIndex: number,
        onAnimationComplete?: () => void,
        sourceState?: GameState
    ) => void,
    updateGameStateImmediate: (newState: GameState, skipAutoPlay?: boolean) => void
) {
    const autoCompleteTimeoutRef = useRef<number | null>(null);

    // Extended Autocomplete: When all tableau cards are face-up, automatically draw from stock
    // and move cards to foundations until game is complete
    useEffect(() => {
        // Clear any existing timeout
        if (autoCompleteTimeoutRef.current) {
            clearTimeout(autoCompleteTimeoutRef.current);
        }

        // Check if we should autocomplete (all tableau cards face-up and not won)
        if (!allTableauCardsFaceUp(gameState) || gameState.gameWon) {
            return;
        }

        // Process next autocomplete action
        autoCompleteTimeoutRef.current = window.setTimeout(() => {
            const action = getNextAutoCompleteAction(gameState);

            if (action.action === 'move' && action.newState && action.moveDetails) {
                // Animate the card move
                const { fromPile, fromIndex, cardIndex, toPile, toIndex } = action.moveDetails;
                animateMove(fromPile, fromIndex, cardIndex, toPile, toIndex);
            } else if (action.action === 'draw' && action.newState) {
                // Draw from stock (no animation for stock draw)
                updateGameStateImmediate(action.newState, true); // Skip auto-play to avoid conflicts
            }
            // If action is 'done', do nothing (no more moves possible)
        }, AUTO_COMPLETE_DELAY_MS); // Small delay for visual effect

        return () => {
            if (autoCompleteTimeoutRef.current) {
                clearTimeout(autoCompleteTimeoutRef.current);
            }
        };
    }, [gameState, animateMove, updateGameStateImmediate]);
}
