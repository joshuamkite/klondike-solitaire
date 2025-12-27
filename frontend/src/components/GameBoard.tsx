import { useState, useReducer, useEffect, useRef } from 'react';
import type { GameState } from '../types/gameState';
import type { Card as CardType } from '../types/card';
import { Card } from './Card';
import { VictoryAnimation } from './VictoryAnimation';
import {
    initializeGame,
    drawFromStock,
    moveCards,
    autoMoveToFoundation,
    findFoundationForCard,
    autoPlay,
} from '../game/klondikeLogic';
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
    const [deckCount, setDeckCount] = useState<1 | 2>(1);
    const [drawCount, setDrawCount] = useState<1 | 3>(1);
    const gameBoardRef = useRef<HTMLDivElement>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);

    const [gameReducerState, dispatch] = useReducer(gameReducer, {
        current: initializeGame(deckCount, drawCount),
        history: []
    });
    const gameState = gameReducerState.current;
    const history = gameReducerState.history;

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

    const updateGameState = (newState: GameState) => {
        dispatch({ type: 'UPDATE_STATE', newState });
    };

    const newGame = () => {
        dispatch({ type: 'NEW_GAME' });
        setSelectedCard(null);
        // Re-initialize with current deck count and draw count
        const newState = initializeGame(deckCount, drawCount);
        dispatch({ type: 'UPDATE_STATE', newState });
    };

    const handleDeckCountChange = (newCount: 1 | 2) => {
        if (newCount === deckCount) return;
        setDeckCount(newCount);
        // Start a new game with the new deck count
        setSelectedCard(null);
        const newState = initializeGame(newCount, drawCount);
        dispatch({ type: 'NEW_GAME', initialState: newState });
    };

    const handleDrawCountChange = (newCount: 1 | 3) => {
        if (newCount === drawCount) return;
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

    const handleAutoPlay = () => {
        const newState = autoPlay(gameState);
        if (newState !== gameState) {
            updateGameState(newState);
            setSelectedCard(null);
        }
    };

    const autoCompleteTimeoutRef = useRef<number | null>(null);

    // Calculate and set card dimensions based on game area width
    useEffect(() => {
        const calculateCardDimensions = () => {
            if (!gameBoardRef.current || !gameAreaRef.current) return;

            const boardPadding = window.innerWidth < 768 ? 10 : 20;

            // Desktop game width: Change this value to adjust game width (0.6 = 60%, 0.7 = 70%, 0.8 = 80%)
            const gameWidthPercent = 0.65;

            const viewportWidth = window.innerWidth - (boardPadding * 2);
            const availableWidth = viewportWidth * gameWidthPercent;

            // Gap between cards
            const cardGap = 10;

            // Tableau: 7 columns for 1 deck, 9 columns for 2 decks
            const tableauItems = deckCount === 1 ? 7 : 9;
            const tableauGaps = tableauItems - 1;

            // Calculate card width to fill available space
            let cardWidth = (availableWidth - (tableauGaps * cardGap)) / tableauItems;

            // Set reasonable bounds (minimum 60px)
            const minWidth = 60;
            cardWidth = Math.max(minWidth, cardWidth);

            // Maintain 5:7 aspect ratio (width:height)
            const cardHeight = cardWidth * 1.4;

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

    // Autocomplete: When stock and waste are empty and all cards are face-up,
    // automatically move cards to foundations
    useEffect(() => {
        // Clear any existing timeout
        if (autoCompleteTimeoutRef.current) {
            clearTimeout(autoCompleteTimeoutRef.current);
        }

        // Check if we should autocomplete
        const shouldAutoComplete =
            gameState.stock.length === 0 &&
            gameState.waste.length === 0 &&
            !gameState.gameWon &&
            gameState.tableau.every(column =>
                column.every(card => card.faceUp)
            );

        if (!shouldAutoComplete) return;

        // Try to move a card to foundation
        autoCompleteTimeoutRef.current = window.setTimeout(() => {
            let moved = false;

            // Try each tableau column
            for (let columnIndex = 0; columnIndex < gameState.tableau.length && !moved; columnIndex++) {
                const column = gameState.tableau[columnIndex];
                if (column.length === 0) continue;

                const card = column[column.length - 1];
                // Find the correct foundation for this card based on suit
                const foundationIndex = findFoundationForCard(card, gameState.foundations);

                if (foundationIndex !== null) {
                    const newState = moveCards(
                        gameState,
                        'tableau',
                        columnIndex,
                        column.length - 1,
                        'foundation',
                        foundationIndex
                    );

                    if (newState) {
                        updateGameState(newState);
                        moved = true;
                        break;
                    }
                }
            }
        }, 300); // Small delay for visual effect

        return () => {
            if (autoCompleteTimeoutRef.current) {
                clearTimeout(autoCompleteTimeoutRef.current);
            }
        };
    }, [gameState]);

    const handleStockClick = () => {
        const newState = drawFromStock(gameState);
        updateGameState(newState);
        setSelectedCard(null);
    };

    const handleWasteClick = () => {
        if (gameState.waste.length === 0) return;

        if (selectedCard) {
            setSelectedCard(null);
        } else {
            setSelectedCard({
                fromPile: 'waste',
                fromIndex: 0,
                cardIndex: gameState.waste.length - 1,
            });
        }
    };

    const handleWasteDoubleClick = () => {
        const newState = autoMoveToFoundation(gameState, 'waste', 0);
        if (newState) {
            updateGameState(newState);
            setSelectedCard(null);
        }
    };

    const handleTableauCardClick = (columnIndex: number, cardIndex: number) => {
        const column = gameState.tableau[columnIndex];
        const card = column[cardIndex];

        if (!card.faceUp) return;

        if (selectedCard) {
            // Only allow moving to a column by clicking on its top card
            const isTopCard = cardIndex === column.length - 1;

            if (isTopCard) {
                // Try to move selected card(s) here
                const newState = moveCards(
                    gameState,
                    selectedCard.fromPile,
                    selectedCard.fromIndex,
                    selectedCard.cardIndex,
                    'tableau',
                    columnIndex
                );
                if (newState) {
                    updateGameState(newState);
                }
            }
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
        const newState = autoMoveToFoundation(gameState, 'tableau', columnIndex);
        if (newState) {
            updateGameState(newState);
            setSelectedCard(null);
        }
    };

    const handleFoundationClick = (foundationIndex: number) => {
        const foundation = gameState.foundations[foundationIndex];

        if (selectedCard) {
            // Get the card being moved
            let card: CardType;
            if (selectedCard.fromPile === 'waste') {
                card = gameState.waste[gameState.waste.length - 1];
            } else if (selectedCard.fromPile === 'foundation') {
                card = gameState.foundations[selectedCard.fromIndex][selectedCard.cardIndex];
            } else {
                card = gameState.tableau[selectedCard.fromIndex][selectedCard.cardIndex];
            }

            // Find the appropriate foundation for this card (smart placement)
            const targetFoundationIndex = findFoundationForCard(card, gameState.foundations);
            if (targetFoundationIndex !== null) {
                const newState = moveCards(
                    gameState,
                    selectedCard.fromPile,
                    selectedCard.fromIndex,
                    selectedCard.cardIndex,
                    'foundation',
                    targetFoundationIndex
                );

                if (newState) {
                    updateGameState(newState);
                }
            }
            setSelectedCard(null);
        } else if (foundation.length > 0) {
            // Select the top card from this foundation
            setSelectedCard({
                fromPile: 'foundation',
                fromIndex: foundationIndex,
                cardIndex: foundation.length - 1,
            });
        }
    };

    const handleEmptyTableauClick = (columnIndex: number) => {
        if (!selectedCard) return;

        const newState = moveCards(
            gameState,
            selectedCard.fromPile,
            selectedCard.fromIndex,
            selectedCard.cardIndex,
            'tableau',
            columnIndex
        );

        if (newState) {
            updateGameState(newState);
        }
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
    };

    const handleDragEnd = () => {
        setDraggedCard(null);
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
    };

    const handleDropOnFoundation = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedCard) return;

        // Get the card being dragged
        let card: CardType;
        if (draggedCard.fromPile === 'waste') {
            card = gameState.waste[gameState.waste.length - 1];
        } else if (draggedCard.fromPile === 'foundation') {
            card = gameState.foundations[draggedCard.fromIndex][draggedCard.cardIndex];
        } else {
            card = gameState.tableau[draggedCard.fromIndex][draggedCard.cardIndex];
        }

        // Find the appropriate foundation for this card
        const foundationIndex = findFoundationForCard(card, gameState.foundations);
        if (foundationIndex === null) {
            setDraggedCard(null);
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
    };

    const isCardSelected = (card: CardType): boolean => {
        if (!selectedCard) return false;

        if (selectedCard.fromPile === 'waste') {
            return gameState.waste.length > 0 && gameState.waste[gameState.waste.length - 1].id === card.id;
        } else if (selectedCard.fromPile === 'foundation') {
            const foundation = gameState.foundations[selectedCard.fromIndex];
            return foundation.length > 0 && foundation[foundation.length - 1].id === card.id;
        } else {
            // For tableau, check if card is part of the selected sequence
            const column = gameState.tableau[selectedCard.fromIndex];

            // Find the card in the column
            const cardIndexInColumn = column.findIndex(c => c.id === card.id);

            // Card is selected if it's at or after the selected index in the same column
            return cardIndexInColumn >= selectedCard.cardIndex && cardIndexInColumn < column.length;
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
                    <button onClick={undo} disabled={history.length === 0}>
                        Undo
                    </button>

                    <button onClick={handleAutoPlay}>
                        Auto Play
                    </button>

                    <div className="control-group">
                        <label>Decks:</label>
                        <div className="toggle-switch">
                            <span className={deckCount === 1 ? 'active' : ''}>1</span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={deckCount === 2}
                                    onChange={() => handleDeckCountChange(deckCount === 1 ? 2 : 1)}
                                />
                                <span className="slider"></span>
                            </label>
                            <span className={deckCount === 2 ? 'active' : ''}>2</span>
                        </div>
                    </div>

                    <div className="control-group">
                        <label>Draw:</label>
                        <div className="toggle-switch">
                            <span className={drawCount === 1 ? 'active' : ''}>1</span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={drawCount === 3}
                                    onChange={() => handleDrawCountChange(drawCount === 1 ? 3 : 1)}
                                />
                                <span className="slider"></span>
                            </label>
                            <span className={drawCount === 3 ? 'active' : ''}>3</span>
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
                            {gameState.stock.length > 0 ? (
                                <Card
                                    card={gameState.stock[gameState.stock.length - 1]}
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
                            {gameState.waste.length > 0 ? (
                                <Card
                                    card={gameState.waste[gameState.waste.length - 1]}
                                    className={isCardSelected(gameState.waste[gameState.waste.length - 1]) ? 'selected' : ''}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, 'waste', 0, gameState.waste.length - 1)}
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
                            const topCard = foundation[foundation.length - 1];
                            // Fixed suit order: HCDS (Hearts, Clubs, Diamonds, Spades)
                            // For 2-deck mode: top row (0-3), bottom row (4-7)
                            const suits = ['hearts', 'clubs', 'diamonds', 'spades', 'hearts', 'clubs', 'diamonds', 'spades'];
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
                                            onDragStart={(e) => handleDragStart(e, 'foundation', index, foundation.length - 1)}
                                            onDragEnd={handleDragEnd}
                                            className={isCardSelected(topCard) ? 'selected' : ''}
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
                                {column.length === 0 ? (
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
                                            onDoubleClick={() => cardIndex === column.length - 1 && handleTableauDoubleClick(columnIndex)}
                                            className={isCardSelected(card) ? 'selected' : ''}
                                            style={{
                                                // Tableau card overlap: -0.75 = 75% overlap. Adjust value between 0 (no overlap) and -1 (100% overlap)
                                                marginTop: cardIndex === 0 ? '0' : `calc(var(--card-height, 140px) * -0.75)`
                                            }}
                                            draggable={card.faceUp}
                                            onDragStart={(e) => handleDragStart(e, 'tableau', columnIndex, cardIndex)}
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
                <p>
                    <a
                        href="https://www.joshuakite.co.uk/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Visit my website
                    </a>
                    {' '} | Card images by Byron Knoll,{' '}
                    <a
                        href="https://commons.wikimedia.org/wiki/Category:SVG_English_pattern_playing_cards"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Wikimedia Commons
                    </a>
                    {' '}(Public Domain)
                </p>
            </footer>
        </div>
    );
}
