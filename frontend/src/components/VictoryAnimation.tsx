import { useState } from 'react';
import {
    VICTORY_PARTICLE_COUNT,
    VICTORY_PARTICLE_SUITS,
    FULL_CIRCLE_DEGREES,
    VICTORY_ANGLE_RANDOMNESS_DEGREES,
    VICTORY_ANGLE_OFFSET_DEGREES,
    VICTORY_VELOCITY_BASE_PX,
    VICTORY_VELOCITY_RANDOM_PX,
    VICTORY_ROTATION_RANGE_DEGREES,
    VICTORY_ROTATION_OFFSET_DEGREES,
    VICTORY_DELAY_MAX_SECONDS,
    SUIT_MODULO,
    DEGREES_TO_RADIANS,
} from '../constants';
import './VictoryAnimation.css';

interface Particle {
    id: number;
    suit: string;
    angle: number;
    velocity: number;
    rotation: number;
    delay: number;
}

interface VictoryAnimationProps {
    onClose?: () => void;
}

export function VictoryAnimation({ onClose }: VictoryAnimationProps) {
    const [particles] = useState(() => {
        const suits = VICTORY_PARTICLE_SUITS;
        const newParticles: Particle[] = [];

        // Create particles (evenly distributed per suit) that burst like fireworks
        for (let i = 0; i < VICTORY_PARTICLE_COUNT; i++) {
            newParticles.push({
                id: i,
                suit: suits[i % SUIT_MODULO],
                angle: (i * FULL_CIRCLE_DEGREES / VICTORY_PARTICLE_COUNT) + (Math.random() * VICTORY_ANGLE_RANDOMNESS_DEGREES - VICTORY_ANGLE_OFFSET_DEGREES),
                velocity: VICTORY_VELOCITY_BASE_PX + Math.random() * VICTORY_VELOCITY_RANDOM_PX,
                rotation: Math.random() * VICTORY_ROTATION_RANGE_DEGREES - VICTORY_ROTATION_OFFSET_DEGREES,
                delay: Math.random() * VICTORY_DELAY_MAX_SECONDS
            });
        }

        return newParticles;
    });

    return (
        <div className="victory-overlay" onClick={onClose}>
            <div className="victory-content">
                <h1 className="victory-title">Congratulations!</h1>
                <p className="victory-subtitle">You Won!</p>
                <div className="particles">
                    {particles.map(particle => {
                        // Calculate final position based on angle and velocity
                        const radians = particle.angle * DEGREES_TO_RADIANS;
                        const dx = Math.cos(radians) * particle.velocity;
                        const dy = Math.sin(radians) * particle.velocity;

                        return (
                            <div
                                key={particle.id}
                                className={`particle suit-${particle.suit === '♥' || particle.suit === '♦' ? 'red' : 'black'}`}
                                style={{
                                    '--dx': dx,
                                    '--dy': dy,
                                    '--rotation': `${particle.rotation}deg`,
                                    animationDelay: `${particle.delay}s`
                                } as React.CSSProperties}
                            >
                                {particle.suit}
                            </div>
                        );
                    })}
                </div>
                <p className="victory-hint">Click anywhere to continue</p>
            </div>
        </div>
    );
}
