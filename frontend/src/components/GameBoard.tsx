import { useState, useEffect, useRef } from 'react';
import type { Card as CardType } from '../types/card';
import type { GameState } from '../types/gameState';
import { Card } from './Card';
import { AnimatedCard } from './AnimatedCard';
import { VictoryAnimation } from './VictoryAnimation';
import { LicenseModal } from './LicenseModal';
import {
    initializeGame,
    drawFromStock,
    findFoundationForCard,
    autoPlaySingleCard,
} from '../game/klondikeLogic';
import {
    useGameState,
    useCardDimensions,
    useCardAnimation,
    useDragAndDrop,
    useAutoComplete,
} from '../hooks';
import {
    AUTO_PLAY_DELAY_MS,
    DRAG_OVERLAY_Z_INDEX,
    DRAG_OVERLAY_TRANSFORM,
    CARD_DEFAULT_HEIGHT_PX,
    CARD_DEFAULT_WIDTH_PX,
    TABLEAU_CARD_OVERLAP_RATIO,
    DRAG_OVERLAY_SPACING_RATIO,
    FOUNDATION_SUIT_ORDER,
    DECK_ONE,
    INITIAL_MOVE_COUNT,
    SEQUENTIAL_RANK_DIFFERENCE,
} from '../constants';
import './GameBoard.css';

export function GameBoard() {
    const [deckCount, setDeckCount] = useState<1 | 2>(DECK_ONE);
    const [drawCount, setDrawCount] = useState<1 | 3>(DECK_ONE);
    const [showLicense, setShowLicense] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showMoreHelp, setShowMoreHelp] = useState(false);
    const gameBoardRef = useRef<HTMLDivElement>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);

    // Refs for card animations - replace DOM queries with React refs
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const foundationRefs = useRef<(HTMLDivElement | null)[]>([]);
    const tableauRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Custom hooks
    const {
        gameState,
        gameStateRef,
        history,
        updateGameState: baseUpdateGameState,
        undo,
        startNewGame,
    } = useGameState(deckCount, drawCount);

    const [selectedCard, setSelectedCard] = useState<{
        fromPile: 'tableau' | 'waste' | 'foundation';
        fromIndex: number;
        cardIndex: number;
    } | null>(null);

    // Card dimensions hook
    useCardDimensions(deckCount, gameBoardRef, gameAreaRef);

    // Card animation hook - pass a ref for the update function to avoid circular dependency
    const updateGameStateImmediateRef = useRef<(newState: GameState, skipAutoPlay?: boolean) => void>(() => { });

    const {
        animatingCards,
        animateMove,
        detectAutoPlayMove,
    } = useCardAnimation(
        gameState,
        (newState: GameState, skipAutoPlay?: boolean) => {
            updateGameStateImmediateRef.current(newState, skipAutoPlay);
        },
        cardRefs,
        foundationRefs,
        tableauRefs
    );

    // Enhanced update function with auto-play
    const updateGameStateImmediate = (newState: GameState, skipAutoPlay: boolean = false) => {
        baseUpdateGameState(newState);

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
                            baseUpdateGameState(nextState);
                            autoPlayRecursive();
                        }
                    }
                    // If no card was moved, stop recursing
                }, AUTO_PLAY_DELAY_MS);
            };

            autoPlayRecursive();
        }
    };

    // Keep the ref up to date using useEffect
    useEffect(() => {
        updateGameStateImmediateRef.current = updateGameStateImmediate;
    });

    const updateGameState = (newState: GameState, skipAutoPlay: boolean = false) => {
        updateGameStateImmediate(newState, skipAutoPlay);
    };

    // Drag and drop hook
    const {
        dragOverlay,
        handleDragStart,
        handleDrag,
        handleDragEnd,
        handleDragOver,
        handleDropOnTableau,
        handleDropOnFoundation,
        isCardDragging,
    } = useDragAndDrop(gameState, updateGameState);

    // Auto-complete hook
    useAutoComplete(gameState, animateMove, updateGameStateImmediate);

    // Helper to create card ref callback
    const createCardRef = (cardId: string) => (element: HTMLDivElement | null) => {
        if (element) {
            cardRefs.current.set(cardId, element);
        } else {
            cardRefs.current.delete(cardId);
        }
    };

    const newGame = () => {
        // Warn if game is in progress (has moves and not won)
        if (gameState.moves > INITIAL_MOVE_COUNT && !gameState.gameWon) {
            const confirmed = window.confirm(
                'Starting a new game will lose your current progress. Are you sure?'
            );
            if (!confirmed) return;
        }

        startNewGame();
        setSelectedCard(null);
        // Re-initialize with current deck count and draw count
        const newState = initializeGame(deckCount, drawCount);
        baseUpdateGameState(newState);
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
        startNewGame(newState);
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
        startNewGame(newState);
    };

    const handleUndo = () => {
        undo();
        setSelectedCard(null);
    };

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

    // Wrapper for drag start that also clears selection
    const handleDragStartWithClear = (
        e: React.DragEvent,
        fromPile: 'tableau' | 'waste' | 'foundation',
        fromIndex: number,
        cardIndex: number
    ) => {
        setSelectedCard(null); // Clear click-based selection when dragging
        handleDragStart(e, fromPile, fromIndex, cardIndex);
    };

    return (
        <div className="game-board" ref={gameBoardRef}>
            <div className="game-header">
                <h1>Klondike Solitaire</h1>

                <div className="game-stats">
                    <span>Moves: {gameState.moves}</span>
                </div>

                <div className="game-controls">
                    <button onClick={handleUndo} disabled={history.length === INITIAL_MOVE_COUNT}>
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
                                    cardRef={createCardRef(gameState.stock[gameState.stock.length - SEQUENTIAL_RANK_DIFFERENCE].id)}
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
                                    onDragStart={(e) => handleDragStartWithClear(e, 'waste', INITIAL_MOVE_COUNT, gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE)}
                                    onDragEnd={handleDragEnd}
                                    cardRef={createCardRef(gameState.waste[gameState.waste.length - SEQUENTIAL_RANK_DIFFERENCE].id)}
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
                                    ref={(el) => { foundationRefs.current[index] = el; }}
                                    className={`cell foundation foundation-${suitName}`}
                                    onClick={() => handleFoundationClick(index)}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDropOnFoundation}
                                >
                                    {topCard ? (
                                        <Card
                                            card={topCard}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStartWithClear(e, 'foundation', index, foundation.length - SEQUENTIAL_RANK_DIFFERENCE)}
                                            onDragEnd={handleDragEnd}
                                            className={`${isCardSelected(topCard) ? 'selected' : ''} ${isCardDragging(topCard) ? 'dragging' : ''}`}
                                            cardRef={createCardRef(topCard.id)}
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
                        <div
                            key={columnIndex}
                            className="tableau-column"
                            ref={(el) => { tableauRefs.current[columnIndex] = el; }}
                        >
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
                                            onDragStart={(e) => handleDragStartWithClear(e, 'tableau', columnIndex, cardIndex)}
                                            onDrag={handleDrag}
                                            onDragEnd={handleDragEnd}
                                            cardRef={createCardRef(card.id)}
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
                    <button
                        onClick={() => setShowHelp(true)}
                        className="footer-button"
                    >
                        How to Play
                    </button>
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

            {/* How to Play Modal */}
            {showHelp && (
                <div className="help-overlay">
                    <div className="help-modal">
                        <button className="help-close" onClick={() => setShowHelp(false)}>× Close</button>
                        <h2>How to Play</h2>

                        <div className="help-content">
                            <section className="help-section">
                                <p>Move all cards to the four foundation piles, building each suit from Ace to King.</p>
                                <p><strong>Tableau:</strong> Build down in alternating colors (red on black, black on red).</p>
                                <p><strong>Stock:</strong> Click to draw cards. Click an empty stock to recycle the waste pile.</p>

                                <button
                                    className="expand-help-button"
                                    onClick={() => setShowMoreHelp(!showMoreHelp)}
                                >
                                    {showMoreHelp ? '▼ Hide Details' : '▶ Show Details'}
                                </button>

                                {showMoreHelp && (
                                    <div className="help-details">
                                        <h3>Objective</h3>
                                        <p>Build all four foundation piles from Ace to King, one for each suit (Hearts, Diamonds, Clubs, Spades).</p>

                                        <h3>Tableau Rules</h3>
                                        <ul>
                                            <li>Build down in alternating colors</li>
                                            <li>Move sequences of face-up cards together</li>
                                            <li>Only Kings can be placed on empty columns</li>
                                            <li>Double-click a card to auto-move it to a foundation</li>
                                        </ul>

                                        <h3>Foundation Rules</h3>
                                        <ul>
                                            <li>Build up by suit from Ace to King</li>
                                            <li>Cards are automatically moved when safe</li>
                                        </ul>

                                        <h3>Game Options</h3>
                                        <ul>
                                            <li><strong>1 Deck:</strong> Classic 52-card game with 7 tableau columns</li>
                                            <li><strong>2 Decks:</strong> Double deck (104 cards) with 9 columns and 8 foundations</li>
                                            <li><strong>Draw 1:</strong> Draw one card at a time (easier)</li>
                                            <li><strong>Draw 3:</strong> Draw three cards at a time (harder)</li>
                                        </ul>

                                        <h3>Tips</h3>
                                        <ul>
                                            <li>Reveal face-down cards as quickly as possible</li>
                                            <li>Don't empty a tableau column unless you have a King to place</li>
                                            <li>Use Undo to try different strategies</li>
                                        </ul>
                                    </div>
                                )}
                            </section>
                        </div>

                        <button className="btn-help-close" onClick={() => setShowHelp(false)}>
                            Got it!
                        </button>
                    </div>
                </div>
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
                                <Card card={card} cardRef={createCardRef(card.id)} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
