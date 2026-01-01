import { useState, useEffect } from 'react';
import type { Card as CardType } from '../types/card';
import type { GameState } from '../types/gameState';
import { moveCards, findFoundationForCard } from '../game/klondikeLogic';
import {
    TRANSPARENT_PIXEL_DATA_URI,
    INVALID_DRAG_COORDINATE,
    INITIAL_MOVE_COUNT,
    SEQUENTIAL_RANK_DIFFERENCE,
} from '../constants';

interface DragState {
    fromPile: 'tableau' | 'waste' | 'foundation';
    fromIndex: number;
    cardIndex: number;
}

interface DragOverlayState {
    cards: CardType[];
    x: number;
    y: number;
}

export function useDragAndDrop(
    gameState: GameState,
    updateGameState: (newState: GameState, skipAutoPlay?: boolean) => void
) {
    const [draggedCard, setDraggedCard] = useState<DragState | null>(null);
    const [dragOverlay, setDragOverlay] = useState<DragOverlayState | null>(null);

    // Fail-safe: Clear drag overlay on any mouseup event globally
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (dragOverlay) {
                setDragOverlay(null);
                setDraggedCard(null);
            }
        };

        document.addEventListener('mouseup', handleGlobalMouseUp);
        document.addEventListener('dragend', handleGlobalMouseUp);

        return () => {
            document.removeEventListener('mouseup', handleGlobalMouseUp);
            document.removeEventListener('dragend', handleGlobalMouseUp);
        };
    }, [dragOverlay]);

    const handleDragStart = (
        e: React.DragEvent,
        fromPile: 'tableau' | 'waste' | 'foundation',
        fromIndex: number,
        cardIndex: number
    ) => {
        setDraggedCard({ fromPile, fromIndex, cardIndex });
        e.dataTransfer.effectAllowed = 'move';

        // For multi-card sequences, set up custom drag overlay
        if (fromPile === 'tableau') {
            const column = gameState.tableau[fromIndex];
            const cardsBeingDragged = column.slice(cardIndex);

            if (cardsBeingDragged.length > SEQUENTIAL_RANK_DIFFERENCE) {
                // Use a transparent 1x1 pixel as the drag image to hide browser's default
                const transparentImg = new Image();
                transparentImg.src = TRANSPARENT_PIXEL_DATA_URI;
                e.dataTransfer.setDragImage(transparentImg, INITIAL_MOVE_COUNT, INITIAL_MOVE_COUNT);

                // Set up our custom overlay
                setDragOverlay({
                    cards: cardsBeingDragged,
                    x: e.clientX,
                    y: e.clientY
                });
            }
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        // Update overlay position if it exists and we have valid coordinates
        // Note: browsers may send 0,0 on the final drag event before dragend
        if (dragOverlay) {
            if (e.clientX !== INVALID_DRAG_COORDINATE || e.clientY !== INVALID_DRAG_COORDINATE) {
                setDragOverlay(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
            }
        }
    };

    const handleDragEnd = () => {
        // Always clear both dragged card and overlay states
        setDraggedCard(null);
        setDragOverlay(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnTableau = (e: React.DragEvent, columnIndex: number) => {
        e.preventDefault();
        if (!draggedCard) return;

        const newState = moveCards(
            gameState,
            draggedCard.fromPile,
            draggedCard.fromIndex,
            draggedCard.cardIndex,
            'tableau',
            columnIndex
        );

        if (newState) {
            updateGameState(newState);
        }
        setDraggedCard(null);
        setDragOverlay(null); // Ensure overlay is cleared on drop
    };

    const handleDropOnFoundation = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedCard) return;

        // Get the card being dragged
        let card: CardType;
        if (draggedCard.fromPile === 'waste') {
            card = gameState.waste[gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE];
        } else if (draggedCard.fromPile === 'foundation') {
            card = gameState.foundations[draggedCard.fromIndex][draggedCard.cardIndex];
        } else {
            card = gameState.tableau[draggedCard.fromIndex][draggedCard.cardIndex];
        }

        // Find the appropriate foundation for this card
        const foundationIndex = findFoundationForCard(card, gameState.foundations);
        if (foundationIndex === null) {
            setDraggedCard(null);
            setDragOverlay(null); // Ensure overlay is cleared
            return;
        }

        const newState = moveCards(
            gameState,
            draggedCard.fromPile,
            draggedCard.fromIndex,
            draggedCard.cardIndex,
            'foundation',
            foundationIndex
        );

        if (newState) {
            updateGameState(newState);
        }
        setDraggedCard(null);
        setDragOverlay(null); // Ensure overlay is cleared on drop
    };

    const isCardDragging = (card: CardType): boolean => {
        if (!draggedCard) return false;

        if (draggedCard.fromPile === 'waste') {
            return gameState.waste.length > INITIAL_MOVE_COUNT && gameState.waste[gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE].id === card.id;
        } else if (draggedCard.fromPile === 'foundation') {
            const foundation = gameState.foundations[draggedCard.fromIndex];
            return foundation.length > INITIAL_MOVE_COUNT && foundation[foundation.length - SEQUENTIAL_RANK_DIFFERENCE].id === card.id;
        } else {
            // For tableau, check if card is part of the dragged sequence
            const column = gameState.tableau[draggedCard.fromIndex];

            // Find the card in the column
            const cardIndexInColumn = column.findIndex(c => c.id === card.id);

            // Card is being dragged if it's at or after the dragged index in the same column
            return cardIndexInColumn >= draggedCard.cardIndex && cardIndexInColumn < column.length;
        }
    };

    return {
        draggedCard,
        dragOverlay,
        handleDragStart,
        handleDrag,
        handleDragEnd,
        handleDragOver,
        handleDropOnTableau,
        handleDropOnFoundation,
        isCardDragging,
    };
}
