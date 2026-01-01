import { useState, useReducer, useEffect, useRef } from 'react';
import type { GameState } from '../types/gameState';
import type { Card as CardType } from '../types/card';
import { Card } from './Card';
import { AnimatedCard } from './AnimatedCard';
import { VictoryAnimation } from './VictoryAnimation';
import { LicenseModal } from './LicenseModal';
import {
    initializeGame,
    drawFromStock,
    moveCards,
    findFoundationForCard,
    autoPlaySingleCard,
    getNextAutoCompleteAction,
    allTableauCardsFaceUp,
} from '../game/klondikeLogic';
import {
    AUTO_PLAY_DELAY_MS,
    AUTO_COMPLETE_DELAY_MS,
    DRAG_OVERLAY_Z_INDEX,
    DRAG_OVERLAY_TRANSFORM,
    GAME_WIDTH_PERCENT,
    MOBILE_BREAKPOINT_PX,
    BOARD_PADDING_MOBILE_PX,
    BOARD_PADDING_DESKTOP_PX,
    CARD_GAP_PX,
    CARD_MIN_WIDTH_PX,
    CARD_ASPECT_RATIO,
    CARD_DEFAULT_HEIGHT_PX,
    CARD_DEFAULT_WIDTH_PX,
    TABLEAU_CARD_OVERLAP_RATIO,
    TABLEAU_CARD_VISIBLE_RATIO,
    DRAG_OVERLAY_SPACING_RATIO,
    TABLEAU_COLUMNS_ONE_DECK,
    TABLEAU_COLUMNS_TWO_DECK,
    FOUNDATION_SUIT_ORDER,
    TRANSPARENT_PIXEL_DATA_URI,
    INVALID_DRAG_COORDINATE,
    DECK_ONE,
    INITIAL_MOVE_COUNT,
    SEQUENTIAL_RANK_DIFFERENCE,
} from '../constants';
import './GameBoard.css';

// Reducer for managing game state and history
type GameAction =
    | { type: 'UPDATE_STATE'; newState: GameState }
    | { type: 'UNDO' }
    | { type: 'NEW_GAME'; initialState?: GameState };

interface GameReducerState {
    current: GameState;
    history: GameState[];
}

function gameReducer(state: GameReducerState, action: GameAction): GameReducerState {
    switch (action.type) {
        case 'UPDATE_STATE':
            return {
                current: action.newState,
                history: [...state.history, state.current],
            };
        case 'UNDO':
            if (state.history.length === 0) return state;
            return {
                current: state.history[state.history.length - 1],
                history: state.history.slice(0, -1),
            };
        case 'NEW_GAME':
            return {
                current: action.initialState || state.current,
                history: [],
            };
        default:
            return state;
    }
}

export function GameBoard() {
    const [deckCount, setDeckCount] = useState<1 | 2>(DECK_ONE);
    const [drawCount, setDrawCount] = useState<1 | 3>(DECK_ONE);
    const [showLicense, setShowLicense] = useState(false);
    const gameBoardRef = useRef<HTMLDivElement>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const gameStateRef = useRef<GameState>(initializeGame(deckCount, drawCount));

    const [gameReducerState, dispatch] = useReducer(gameReducer, {
        current: initializeGame(deckCount, drawCount),
        history: []
    });
    const gameState = gameReducerState.current;
    const history = gameReducerState.history;

    // Keep ref in sync with current state
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const [selectedCard, setSelectedCard] = useState<{
        fromPile: 'tableau' | 'waste' | 'foundation';
        fromIndex: number;
        cardIndex: number;
    } | null>(null);

    const [draggedCard, setDraggedCard] = useState<{
        fromPile: 'tableau' | 'waste' | 'foundation';
        fromIndex: number;
        cardIndex: number;
    } | null>(null);

    // Custom drag overlay state for multi-card sequences
    const [dragOverlay, setDragOverlay] = useState<{
        cards: CardType[];
        x: number;
        y: number;
    } | null>(null);

    // Animation state
    const [animatingCards, setAnimatingCards] = useState<{
        cards: CardType[];
        startPos: { x: number; y: number };
        endPos: { x: number; y: number };
        onComplete: () => void;
    } | null>(null);

    // Helper function to get card element position
    const getCardPosition = (cardId: string): { x: number; y: number } | null => {
        const element = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top
        };
    };

    // Helper to get the destination element position (uses current DOM state, not future state)
    const getDestinationPosition = (
        toPile: 'tableau' | 'foundation',
        toIndex: number
    ): { x: number; y: number } | null => {
        if (toPile === 'foundation') {
            // Find the foundation cell
            const foundationCells = document.querySelectorAll('.foundation');
            const targetCell = foundationCells[toIndex] as HTMLElement;
            if (!targetCell) return null;

            const rect = targetCell.getBoundingClientRect();
            return { x: rect.left, y: rect.top };
        } else {
            // Tableau column - find the current last card in DOM
            const tableauColumns = document.querySelectorAll('.tableau-column');
            const targetColumn = tableauColumns[toIndex] as HTMLElement;
            if (!targetColumn) return null;

            // Look for cards in this column
            const cards = targetColumn.querySelectorAll('.card');
            if (cards.length > 0) {
                // Get the last card's position
                const lastCard = cards[cards.length - 1] as HTMLElement;
                const rect = lastCard.getBoundingClientRect();

                // Calculate the position for the new card (below the last one)
                const cardHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-height') || `${CARD_DEFAULT_HEIGHT_PX}`);
                return {
                    x: rect.left,
                    y: rect.top + cardHeight * TABLEAU_CARD_VISIBLE_RATIO // 75% overlap means 25% visible
                };
            } else {
                // Empty column - get the placeholder position
                const placeholder = targetColumn.querySelector('.card-placeholder') as HTMLElement;
                if (!placeholder) return null;

                const rect = placeholder.getBoundingClientRect();
                return { x: rect.left, y: rect.top };
            }
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

        // Get start position
        const startPos = getCardPosition(firstCardId);
        if (!startPos) {
            // Can't animate - just do the move immediately
            const newState = moveCards(gameState, fromPile, fromIndex, cardIndex, toPile, toIndex);
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

        // Get end position based on current DOM state
        const endPos = getDestinationPosition(toPile, toIndex);
        if (!endPos) {
            // Can't get end position - just update immediately
            updateGameStateImmediate(newState);
            onAnimationComplete?.();
            return;
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

    const updateGameStateImmediate = (newState: GameState, skipAutoPlay: boolean = false) => {
        dispatch({ type: 'UPDATE_STATE', newState });

        // Auto-play: automatically move safe cards to foundations one at a time (FreeCell-style)
        if (!skipAutoPlay && !newState.gameWon) {
            // Recursive function to move cards one at a time with delays
            const autoPlayRecursive = () => {
                setTimeout(() => {
                    // Get current state from the ref (always latest)
                    const currentState = gameStateRef.current;
                    const nextState = autoPlaySingleCard(currentState);
                    if (nextState !== currentState) {
                        // A card was moved, detect which one
                        const move = detectAutoPlayMove(currentState, nextState);
                        if (move) {
                            // Animate from current DOM state to new state
                            animateMove(
                                move.fromPile,
                                move.fromIndex,
                                move.cardIndex,
                                move.toPile,
                                move.toIndex,
                                () => {
                                    // Continue auto-play after animation
                                    autoPlayRecursive();
                                },
                                currentState  // Pass the current state so it knows which cards to look for
                            );
                        } else {
                            // Couldn't detect move, just update state
                            dispatch({ type: 'UPDATE_STATE', newState: nextState });
                            autoPlayRecursive();
                        }
                    }
                    // If no card was moved, stop recursing
                }, AUTO_PLAY_DELAY_MS);
            };

            autoPlayRecursive();
        }
    };

    const updateGameState = (newState: GameState, skipAutoPlay: boolean = false) => {
        updateGameStateImmediate(newState, skipAutoPlay);
    };

    const newGame = () => {
        // Warn if game is in progress (has moves and not won)
        if (gameState.moves > INITIAL_MOVE_COUNT && !gameState.gameWon) {
            const confirmed = window.confirm(
                'Starting a new game will lose your current progress. Are you sure?'
            );
            if (!confirmed) return;
        }

        dispatch({ type: 'NEW_GAME' });
        setSelectedCard(null);
        // Re-initialize with current deck count and draw count
        const newState = initializeGame(deckCount, drawCount);
        dispatch({ type: 'UPDATE_STATE', newState });
    };

    const handleDeckCountChange = (newCount: 1 | 2) => {
        if (newCount === deckCount) return;

        // Warn if game is in progress (has moves and not won)
        if (gameState.moves > INITIAL_MOVE_COUNT && !gameState.gameWon) {
            const confirmed = window.confirm(
                `Changing to ${newCount} deck${newCount > 1 ? 's' : ''} will start a new game and lose your current progress. Continue?`
            );
            if (!confirmed) return;
        }

        setDeckCount(newCount);
        // Start a new game with the new deck count
        setSelectedCard(null);
        const newState = initializeGame(newCount, drawCount);
        dispatch({ type: 'NEW_GAME', initialState: newState });
    };

    const handleDrawCountChange = (newCount: 1 | 3) => {
        if (newCount === drawCount) return;

        // Warn if game is in progress (has moves and not won)
        if (gameState.moves > INITIAL_MOVE_COUNT && !gameState.gameWon) {
            const confirmed = window.confirm(
                `Changing to draw ${newCount} will start a new game and lose your current progress. Continue?`
            );
            if (!confirmed) return;
        }

        setDrawCount(newCount);
        // Start a new game with the new draw count
        setSelectedCard(null);
        const newState = initializeGame(deckCount, newCount);
        dispatch({ type: 'NEW_GAME', initialState: newState });
    };

    const undo = () => {
        dispatch({ type: 'UNDO' });
        setSelectedCard(null);
    };

    const autoCompleteTimeoutRef = useRef<number | null>(null);

    // Warn before leaving page if game is in progress
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Only warn if game is in progress (has moves and not won)
            if (gameState.moves > INITIAL_MOVE_COUNT && !gameState.gameWon) {
                e.preventDefault();
                // Modern browsers require returnValue to be set
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [gameState.moves, gameState.gameWon]);

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
    }, [deckCount]);

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
    }, [gameState]);

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

    const handleStockClick = () => {
        const newState = drawFromStock(gameState);
        updateGameState(newState);
        setSelectedCard(null);
    };

    const handleWasteClick = () => {
        if (gameState.waste.length === INITIAL_MOVE_COUNT) return;

        if (selectedCard) {
            setSelectedCard(null);
        } else {
            setSelectedCard({
                fromPile: 'waste',
                fromIndex: INITIAL_MOVE_COUNT,
                cardIndex: gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE,
            });
        }
    };

    const handleWasteDoubleClick = () => {
        if (gameState.waste.length === INITIAL_MOVE_COUNT) return;

        const card = gameState.waste[gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE];
        const targetFoundationIndex = findFoundationForCard(card, gameState.foundations);

        if (targetFoundationIndex !== null) {
            animateMove('waste', INITIAL_MOVE_COUNT, gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE, 'foundation', targetFoundationIndex);
            setSelectedCard(null);
        }
    };

    const handleTableauCardClick = (columnIndex: number, cardIndex: number) => {
        const column = gameState.tableau[columnIndex];
        const card = column[cardIndex];

        if (!card.faceUp) return;

        if (selectedCard) {
            // Allow clicking on any card in the column to move selected cards there
            // This is especially important for mobile where cards overlap heavily
            animateMove(
                selectedCard.fromPile,
                selectedCard.fromIndex,
                selectedCard.cardIndex,
                'tableau',
                columnIndex
            );
            setSelectedCard(null);
        } else {
            // Select this card
            setSelectedCard({
                fromPile: 'tableau',
                fromIndex: columnIndex,
                cardIndex,
            });
        }
    };

    const handleTableauDoubleClick = (columnIndex: number) => {
        const column = gameState.tableau[columnIndex];
        if (column.length === INITIAL_MOVE_COUNT) return;

        const card = column[column.length - SEQUENTIAL_RANK_DIFFERENCE];
        const targetFoundationIndex = findFoundationForCard(card, gameState.foundations);

        if (targetFoundationIndex !== null) {
            animateMove('tableau', columnIndex, column.length - SEQUENTIAL_RANK_DIFFERENCE, 'foundation', targetFoundationIndex);
            setSelectedCard(null);
        }
    };

    const handleFoundationClick = (foundationIndex: number) => {
        const foundation = gameState.foundations[foundationIndex];

        if (selectedCard) {
            // Get the card being moved
            let card: CardType;
            if (selectedCard.fromPile === 'waste') {
                card = gameState.waste[gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE];
            } else if (selectedCard.fromPile === 'foundation') {
                card = gameState.foundations[selectedCard.fromIndex][selectedCard.cardIndex];
            } else {
                card = gameState.tableau[selectedCard.fromIndex][selectedCard.cardIndex];
            }

            // Find the appropriate foundation for this card (smart placement)
            const targetFoundationIndex = findFoundationForCard(card, gameState.foundations);
            if (targetFoundationIndex !== null) {
                animateMove(
                    selectedCard.fromPile,
                    selectedCard.fromIndex,
                    selectedCard.cardIndex,
                    'foundation',
                    targetFoundationIndex
                );
            }
            setSelectedCard(null);
        } else if (foundation.length > INITIAL_MOVE_COUNT) {
            // Select the top card from this foundation
            setSelectedCard({
                fromPile: 'foundation',
                fromIndex: foundationIndex,
                cardIndex: foundation.length - SEQUENTIAL_RANK_DIFFERENCE,
            });
        }
    };

    const handleEmptyTableauClick = (columnIndex: number) => {
        if (!selectedCard) return;

        animateMove(
            selectedCard.fromPile,
            selectedCard.fromIndex,
            selectedCard.cardIndex,
            'tableau',
            columnIndex
        );
        setSelectedCard(null);
    };

    const handleDragStart = (
        e: React.DragEvent,
        fromPile: 'tableau' | 'waste' | 'foundation',
        fromIndex: number,
        cardIndex: number
    ) => {
        setDraggedCard({ fromPile, fromIndex, cardIndex });
        setSelectedCard(null); // Clear click-based selection when dragging
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

    const isCardSelected = (card: CardType): boolean => {
        if (!selectedCard) return false;

        if (selectedCard.fromPile === 'waste') {
            return gameState.waste.length > INITIAL_MOVE_COUNT && gameState.waste[gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE].id === card.id;
        } else if (selectedCard.fromPile === 'foundation') {
            const foundation = gameState.foundations[selectedCard.fromIndex];
            return foundation.length > INITIAL_MOVE_COUNT && foundation[foundation.length - SEQUENTIAL_RANK_DIFFERENCE].id === card.id;
        } else {
            // For tableau, check if card is part of the selected sequence
            const column = gameState.tableau[selectedCard.fromIndex];

            // Find the card in the column
            const cardIndexInColumn = column.findIndex(c => c.id === card.id);

            // Card is selected if it's at or after the selected index in the same column
            return cardIndexInColumn >= selectedCard.cardIndex && cardIndexInColumn < column.length;
        }
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

    return (
        <div className="game-board" ref={gameBoardRef}>
            <div className="game-header">
                <h1>Klondike Solitaire</h1>

                <div className="game-stats">
                    <span>Moves: {gameState.moves}</span>
                </div>

                <div className="game-controls">
                    <button onClick={undo} disabled={history.length === INITIAL_MOVE_COUNT}>
                        Undo
                    </button>

                    <div className="control-group">
                        <label>Decks:</label>
                        <div className="toggle-switch">
                            <span
                                className={deckCount === DECK_ONE ? 'active' : ''}
                                onClick={() => handleDeckCountChange(DECK_ONE)}
                                style={{ cursor: 'pointer' }}
                            >1</span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={deckCount === 2}
                                    onChange={() => handleDeckCountChange(deckCount === DECK_ONE ? 2 : DECK_ONE)}
                                />
                                <span className="slider"></span>
                            </label>
                            <span
                                className={deckCount === 2 ? 'active' : ''}
                                onClick={() => handleDeckCountChange(2)}
                                style={{ cursor: 'pointer' }}
                            >2</span>
                        </div>
                    </div>

                    <div className="control-group">
                        <label>Draw:</label>
                        <div className="toggle-switch">
                            <span
                                className={drawCount === DECK_ONE ? 'active' : ''}
                                onClick={() => handleDrawCountChange(DECK_ONE)}
                                style={{ cursor: 'pointer' }}
                            >1</span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={drawCount === 3}
                                    onChange={() => handleDrawCountChange(drawCount === DECK_ONE ? 3 : DECK_ONE)}
                                />
                                <span className="slider"></span>
                            </label>
                            <span
                                className={drawCount === 3 ? 'active' : ''}
                                onClick={() => handleDrawCountChange(3)}
                                style={{ cursor: 'pointer' }}
                            >3</span>
                        </div>
                    </div>

                    <button onClick={newGame}>New Game</button>
                </div>
            </div>

            <div className="game-area" ref={gameAreaRef}>
                {/* Top Area: Stock/Waste and Foundations */}
                <div className={`top-area ${deckCount === 2 ? 'two-deck' : ''}`}>
                    <div className="stock-waste">
                        {/* Stock (draw pile) */}
                        <div
                            className="stock cell"
                            onClick={handleStockClick}
                        >
                            {gameState.stock.length > INITIAL_MOVE_COUNT ? (
                                <Card
                                    card={gameState.stock[gameState.stock.length - SEQUENTIAL_RANK_DIFFERENCE]}
                                />
                            ) : (
                                <div className="card-placeholder empty-stock">↻</div>
                            )}
                        </div>

                        {/* Waste (discard pile) */}
                        <div
                            className="waste cell"
                            onClick={handleWasteClick}
                            onDoubleClick={handleWasteDoubleClick}
                        >
                            {gameState.waste.length > INITIAL_MOVE_COUNT ? (
                                <Card
                                    card={gameState.waste[gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE]}
                                    className={`${isCardSelected(gameState.waste[gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE]) ? 'selected' : ''} ${isCardDragging(gameState.waste[gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE]) ? 'dragging' : ''}`}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, 'waste', INITIAL_MOVE_COUNT, gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE)}
                                    onDragEnd={handleDragEnd}
                                />
                            ) : (
                                <div className="card-placeholder"></div>
                            )}
                        </div>
                    </div>

                    {/* Foundations - Fixed order: HCDS (Hearts, Clubs, Diamonds, Spades) */}
                    <div className={`foundations ${deckCount === 2 ? 'two-deck' : ''}`}>
                        {gameState.foundations.map((foundation, index) => {
                            const topCard = foundation[foundation.length - SEQUENTIAL_RANK_DIFFERENCE];
                            // Fixed suit order: HCDS (Hearts, Clubs, Diamonds, Spades)
                            // For 2-deck mode: top row (0-3), bottom row (4-7)
                            const suits = [...FOUNDATION_SUIT_ORDER, ...FOUNDATION_SUIT_ORDER];
                            const suitName = suits[index];
                            return (
                                <div
                                    key={index}
                                    className={`cell foundation foundation-${suitName}`}
                                    onClick={() => handleFoundationClick(index)}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDropOnFoundation}
                                >
                                    {topCard ? (
                                        <Card
                                            card={topCard}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, 'foundation', index, foundation.length - SEQUENTIAL_RANK_DIFFERENCE)}
                                            onDragEnd={handleDragEnd}
                                            className={`${isCardSelected(topCard) ? 'selected' : ''} ${isCardDragging(topCard) ? 'dragging' : ''}`}
                                        />
                                    ) : (
                                        <div className="card-placeholder"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Tableau */}
                <div className={`tableau ${deckCount === 2 ? 'two-deck' : ''}`}>
                    {gameState.tableau.map((column, columnIndex) => (
                        <div key={columnIndex} className="tableau-column">
                            <div
                                className="column-drop-zone"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropOnTableau(e, columnIndex)}
                            >
                                {column.length === INITIAL_MOVE_COUNT ? (
                                    <div
                                        className="card-placeholder"
                                        onClick={() => handleEmptyTableauClick(columnIndex)}
                                    ></div>
                                ) : (
                                    column.map((card, cardIndex) => (
                                        <Card
                                            key={card.id}
                                            card={card}
                                            onClick={() => handleTableauCardClick(columnIndex, cardIndex)}
                                            onDoubleClick={() => cardIndex === column.length - SEQUENTIAL_RANK_DIFFERENCE && handleTableauDoubleClick(columnIndex)}
                                            className={`${isCardSelected(card) ? 'selected' : ''} ${isCardDragging(card) ? 'dragging' : ''}`}
                                            style={{
                                                // Tableau card overlap: -0.75 = 75% overlap. Adjust value between 0 (no overlap) and -1 (100% overlap)
                                                marginTop: cardIndex === INITIAL_MOVE_COUNT ? '0' : `calc(var(--card-height, ${CARD_DEFAULT_HEIGHT_PX}px) * -${TABLEAU_CARD_OVERLAP_RATIO})`
                                            }}
                                            draggable={card.faceUp}
                                            onDragStart={(e) => handleDragStart(e, 'tableau', columnIndex, cardIndex)}
                                            onDrag={handleDrag}
                                            onDragEnd={handleDragEnd}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {gameState.gameWon && (
                <VictoryAnimation onClose={newGame} />
            )}

            <footer className="game-footer">
                <div className="footer-buttons">
                    <a
                        href="https://www.joshuakite.co.uk/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-button"
                    >
                        Visit my Website
                    </a>
                    <button
                        onClick={() => setShowLicense(true)}
                        className="footer-button"
                    >
                        View Licences
                    </button>
                    <a
                        href="https://github.com/joshuamkite/klondike-solitaire"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-button"
                    >
                        View Source
                    </a>
                </div>
            </footer>

            {showLicense && (
                <LicenseModal onClose={() => setShowLicense(false)} />
            )}

            {animatingCards && (
                <AnimatedCard
                    cards={animatingCards.cards}
                    startPos={animatingCards.startPos}
                    endPos={animatingCards.endPos}
                    onComplete={animatingCards.onComplete}
                />
            )}

            {/* Custom drag overlay for multi-card sequences */}
            {dragOverlay && (
                <div
                    style={{
                        position: 'fixed',
                        left: dragOverlay.x,
                        top: dragOverlay.y,
                        pointerEvents: 'none',
                        zIndex: DRAG_OVERLAY_Z_INDEX,
                        transform: DRAG_OVERLAY_TRANSFORM,
                    }}
                >
                    <div style={{ position: 'relative' }}>
                        {dragOverlay.cards.map((card, index) => (
                            <div
                                key={card.id}
                                style={{
                                    position: 'absolute',
                                    top: `calc(${index} * var(--card-height, ${CARD_DEFAULT_HEIGHT_PX}px) * ${DRAG_OVERLAY_SPACING_RATIO})`,
                                    left: INITIAL_MOVE_COUNT,
                                    width: `var(--card-width, ${CARD_DEFAULT_WIDTH_PX}px)`,
                                    height: 'var(--card-height, 140px)',
                                }}
                            >
                                <Card card={card} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
