import { useEffect, useRef, useState } from 'react';
import type { Card as CardType } from '../types/card';
import { Card } from './Card';
import {
    CARD_ANIMATION_DURATION_MS,
    ANIMATED_CARD_Z_INDEX,
    ANIMATION_EASING,
    INITIAL_TRANSFORM,
} from '../constants';
import {
    TABLEAU_CARD_OVERLAP_RATIO,
    CARD_DEFAULT_HEIGHT_PX,
} from '../constants';
import './AnimatedCard.css';

interface AnimatedCardProps {
    cards: CardType[];
    startPos: { x: number; y: number };
    endPos: { x: number; y: number };
    onComplete: () => void;
    duration?: number;
}

export function AnimatedCard({
    cards,
    startPos,
    endPos,
    onComplete,
    duration = CARD_ANIMATION_DURATION_MS
}: AnimatedCardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Trigger animation in next frame to ensure CSS transition works
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setIsAnimating(true);
            });
        });

        // Complete animation after duration
        const timer = setTimeout(() => {
            onComplete();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onComplete]);

    const transform = isAnimating
        ? `translate(${endPos.x - startPos.x}px, ${endPos.y - startPos.y}px)`
        : INITIAL_TRANSFORM;

    return (
        <div
            ref={containerRef}
            className="animated-card-container"
            style={{
                position: 'fixed',
                left: startPos.x,
                top: startPos.y,
                zIndex: ANIMATED_CARD_Z_INDEX,
                pointerEvents: 'none',
                transform,
                transition: `transform ${duration}ms ${ANIMATION_EASING}`,
            }}
        >
            {cards.map((card, index) => (
                <Card
                    key={card.id}
                    card={card}
                    style={{
                        marginTop: index === 0 ? '0' : `calc(var(--card-height, ${CARD_DEFAULT_HEIGHT_PX}px) * -${TABLEAU_CARD_OVERLAP_RATIO})`
                    }}
                />
            ))}
        </div>
    );
}
