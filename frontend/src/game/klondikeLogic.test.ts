import { describe, expect, it } from 'vitest'
import type { Card, Rank, Suit } from '../types/card'
import type { GameState } from '../types/gameState'
import {
  allTableauCardsFaceUp,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  checkWin,
  createDeck,
  drawFromStock,
  findFoundationForCard,
  getNextAutoCompleteAction,
  initializeGame,
  isValidSequence,
  moveCards,
  shuffleDeck,
} from './klondikeLogic'

const card = (rank: Rank, suit: Suit, faceUp = true): Card => ({
  rank,
  suit,
  faceUp,
  id: `${rank}-${suit}`,
  deckNumber: 1,
})

const emptyState = (overrides: Partial<GameState> = {}): GameState => ({
  tableau: Array.from({ length: 7 }, () => []),
  foundations: Array.from({ length: 4 }, () => []),
  stock: [],
  waste: [],
  moves: 0,
  startTime: 0,
  gameWon: false,
  deckCount: 1,
  drawCount: 1,
  ...overrides,
})

describe('deck creation', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map((c) => c.id)).size).toBe(52)
  })

  it('shuffle keeps all cards without mutating the input', () => {
    const deck = createDeck()
    const copy = [...deck]
    const shuffled = shuffleDeck(deck)
    expect(deck).toEqual(copy)
    expect(shuffled.map((c) => c.id).sort()).toEqual(
      copy.map((c) => c.id).sort(),
    )
  })
})

describe('initializeGame', () => {
  it('deals 1 deck into 7 columns with 4 foundations', () => {
    const s = initializeGame(1, 3)
    expect(s.tableau.map((c) => c.length)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(s.foundations).toHaveLength(4)
    expect(s.stock).toHaveLength(24)
    expect(s.drawCount).toBe(3)
  })

  it('deals 2 decks into 9 columns with 8 foundations', () => {
    const s = initializeGame(2, 1)
    expect(s.tableau.map((c) => c.length)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(s.foundations).toHaveLength(8)
    expect(s.stock).toHaveLength(104 - 45)
  })

  it('only the top card of each column is face up', () => {
    for (const col of initializeGame(1).tableau) {
      col.forEach((c, i) => {
        expect(c.faceUp).toBe(i === col.length - 1)
      })
    }
  })
})

describe('placement rules', () => {
  it('foundation: ace starts, then same suit ascending', () => {
    expect(canPlaceOnFoundation(card('ace', 'hearts'), [])).toBe(true)
    expect(canPlaceOnFoundation(card('2', 'hearts'), [])).toBe(false)
    const f = [card('ace', 'hearts')]
    expect(canPlaceOnFoundation(card('2', 'hearts'), f)).toBe(true)
    expect(canPlaceOnFoundation(card('2', 'spades'), f)).toBe(false)
    expect(canPlaceOnFoundation(card('3', 'hearts'), f)).toBe(false)
  })

  it('tableau: only kings on empty, else descending alternate colour', () => {
    expect(canPlaceOnTableau(card('king', 'clubs'), [])).toBe(true)
    expect(canPlaceOnTableau(card('queen', 'clubs'), [])).toBe(false)
    const col = [card('7', 'spades')]
    expect(canPlaceOnTableau(card('6', 'hearts'), col)).toBe(true)
    expect(canPlaceOnTableau(card('6', 'clubs'), col)).toBe(false)
    expect(canPlaceOnTableau(card('5', 'hearts'), col)).toBe(false)
  })

  it('isValidSequence checks order and colours', () => {
    expect(isValidSequence([])).toBe(false)
    expect(isValidSequence([card('5', 'hearts')])).toBe(true)
    expect(isValidSequence([card('7', 'spades'), card('6', 'hearts')])).toBe(
      true,
    )
    expect(isValidSequence([card('7', 'spades'), card('6', 'clubs')])).toBe(
      false,
    )
    expect(isValidSequence([card('7', 'spades'), card('5', 'hearts')])).toBe(
      false,
    )
  })
})

describe('findFoundationForCard', () => {
  it('uses fixed hearts/clubs/diamonds/spades order', () => {
    const f = Array.from({ length: 4 }, () => [] as Card[])
    expect(findFoundationForCard(card('ace', 'hearts'), f)).toBe(0)
    expect(findFoundationForCard(card('ace', 'clubs'), f)).toBe(1)
    expect(findFoundationForCard(card('ace', 'diamonds'), f)).toBe(2)
    expect(findFoundationForCard(card('ace', 'spades'), f)).toBe(3)
    expect(findFoundationForCard(card('2', 'spades'), f)).toBeNull()
  })

  it('in 2-deck mode falls through to the second row', () => {
    const f = Array.from({ length: 8 }, () => [] as Card[])
    f[0] = [card('ace', 'hearts')]
    expect(findFoundationForCard(card('ace', 'hearts'), f)).toBe(4)
    expect(findFoundationForCard(card('2', 'hearts'), f)).toBe(0)
  })
})

describe('drawFromStock', () => {
  it('draws drawCount cards face up and counts a move', () => {
    const stock = ['2', '3', '4', '5'].map((r) =>
      card(r as Rank, 'clubs', false),
    )
    const s = drawFromStock(emptyState({ stock, drawCount: 3 }))
    expect(s.waste).toHaveLength(3)
    expect(s.stock).toHaveLength(1)
    expect(s.waste.every((c) => c.faceUp)).toBe(true)
    expect(s.moves).toBe(1)
  })

  it('recycles the waste back into the stock when empty', () => {
    const waste = [card('2', 'clubs'), card('3', 'clubs')]
    const s = drawFromStock(emptyState({ waste }))
    expect(s.waste).toHaveLength(0)
    expect(s.stock.map((c) => c.rank)).toEqual(['3', '2'])
    expect(s.stock.every((c) => !c.faceUp)).toBe(true)
  })

  it('does not mutate the original state', () => {
    const state = emptyState({ stock: [card('2', 'clubs', false)] })
    drawFromStock(state)
    expect(state.stock).toHaveLength(1)
    expect(state.waste).toHaveLength(0)
  })
})

describe('moveCards', () => {
  it('moves a run between tableau columns', () => {
    const state = emptyState()
    state.tableau[0] = [card('7', 'spades'), card('6', 'hearts')]
    state.tableau[1] = [card('8', 'diamonds')]
    const next = moveCards(state, 'tableau', 0, 0, 'tableau', 1)
    expect(next).not.toBeNull()
    expect(next?.tableau[0]).toHaveLength(0)
    expect(next?.tableau[1].map((c) => c.rank)).toEqual(['8', '7', '6'])
    expect(state.tableau[0]).toHaveLength(2)
  })

  it('rejects illegal moves', () => {
    const state = emptyState()
    state.tableau[0] = [card('7', 'spades')]
    state.tableau[1] = [card('8', 'clubs')]
    expect(moveCards(state, 'tableau', 0, 0, 'tableau', 1)).toBeNull()
  })

  it('moves waste card to foundation', () => {
    const state = emptyState({ waste: [card('ace', 'hearts')] })
    const next = moveCards(state, 'waste', 0, 0, 'foundation', 0)
    expect(next?.foundations[0]).toHaveLength(1)
    expect(next?.waste).toHaveLength(0)
  })

  it('rejects moving from an empty waste', () => {
    expect(moveCards(emptyState(), 'waste', 0, 0, 'foundation', 0)).toBeNull()
  })
})

describe('win and autocomplete', () => {
  const fullFoundations = () =>
    (['hearts', 'clubs', 'diamonds', 'spades'] as Suit[]).map((suit) =>
      createDeck()
        .filter((c) => c.suit === suit)
        .map((c) => ({ ...c, faceUp: true })),
    )

  it('checkWin requires all foundations full', () => {
    expect(checkWin(emptyState())).toBe(false)
    expect(checkWin(emptyState({ foundations: fullFoundations() }))).toBe(true)
  })

  it('allTableauCardsFaceUp detects face-down cards', () => {
    const state = emptyState()
    state.tableau[0] = [card('5', 'clubs', false), card('4', 'hearts')]
    expect(allTableauCardsFaceUp(state)).toBe(false)
    state.tableau[0][0].faceUp = true
    expect(allTableauCardsFaceUp(state)).toBe(true)
  })

  it('autocomplete is inactive while a card is face down', () => {
    const state = emptyState()
    state.tableau[0] = [card('5', 'clubs', false)]
    expect(getNextAutoCompleteAction(state).action).toBe('done')
  })

  it('autocomplete moves an available card to its foundation', () => {
    const state = emptyState()
    state.tableau[0] = [card('ace', 'spades')]
    const result = getNextAutoCompleteAction(state)
    expect(result.action).toBe('move')
    expect(result.moveDetails?.toIndex).toBe(3)
    expect(result.newState?.foundations[3]).toHaveLength(1)
  })
})
