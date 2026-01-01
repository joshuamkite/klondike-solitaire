import { useReducer, useRef, useEffect } from 'react';
import type { GameState } from '../types/gameState';
import { initializeGame } from '../game/klondikeLogic';

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

export function useGameState(deckCount: 1 | 2, drawCount: 1 | 3) {
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

    const updateGameState = (newState: GameState) => {
        dispatch({ type: 'UPDATE_STATE', newState });
    };

    const undo = () => {
        dispatch({ type: 'UNDO' });
    };

    const startNewGame = (initialState?: GameState) => {
        dispatch({ type: 'NEW_GAME', initialState });
    };

    return {
        gameState,
        gameStateRef,
        history,
        updateGameState,
        undo,
        startNewGame,
    };
}
