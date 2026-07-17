'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionType, Card, GameState, StrategyRecommendation, WsMessage } from '@/lib/poker/types';

interface HUDProps {
  lastMessage: WsMessage | null;
  isConnected: boolean;
  currentFps: number;
}

interface RecommendationDisplay {
  gameState: GameState;
  recommendation: StrategyRecommendation;
}

const ACTION_LABELS: Record<ActionType, string> = {
  FOLD: 'Fold',
  CHECK: 'Pasar',
  CALL: 'Igualar',
  RAISE: 'Subir',
  ALL_IN: 'All-In',
};

const ACTION_COLORS: Record<ActionType, string> = {
  ALL_IN: 'bg-red-600 border-red-400/50 shadow-[0_0_18px_rgba(239,68,68,0.3)]',
  RAISE: 'bg-orange-600 border-orange-400/50 shadow-[0_0_18px_rgba(249,115,22,0.3)]',
  CALL: 'bg-blue-600 border-blue-400/50 shadow-[0_0_18px_rgba(59,130,246,0.3)]',
  CHECK: 'bg-emerald-600 border-emerald-400/50 shadow-[0_0_18px_rgba(16,185,129,0.3)]',
  FOLD: 'bg-gray-600 border-gray-400/50 shadow-[0_0_18px_rgba(156,163,175,0.3)]',
};

const SUIT_SYMBOLS: Record<string, string> = {
  s: '\u2660',
  h: '\u2665',
  d: '\u2666',
  c: '\u2663',
};

const SUIT_COLORS: Record<string, string> = {
  s: 'text-white',
  h: 'text-red-400',
  d: 'text-red-400',
  c: 'text-white',
};

function cardToString(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]?.charCodeAt(0).toString(16) ?? ''}`;
}

function getSuitSymbol(suit: string): string {
  return SUIT_SYMBOLS[suit] ?? suit;
}

function getSuitColor(suit: string): string {
  return SUIT_COLORS[suit] ?? 'text-white';
}

export default function HUD({ lastMessage, isConnected, currentFps }: HUDProps) {
  const [display, setDisplay] = useState<RecommendationDisplay | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const prevRef = useRef<RecommendationDisplay | null>(null);

  useEffect(() => {
    if (
      lastMessage &&
      lastMessage.type === 'recommendation' &&
      lastMessage.detected_state &&
      lastMessage.recommendation
    ) {
      prevRef.current = display;
      setTransitioning(true);
      const timer = setTimeout(() => setTransitioning(false), 300);
      setDisplay({
        gameState: lastMessage.detected_state,
        recommendation: lastMessage.recommendation,
      });
      return () => clearTimeout(timer);
    }
  }, [lastMessage]);

  const getPhaseColor = useCallback((phase: string): string => {
    switch (phase) {
      case 'PREFLOP':
        return 'text-cyan-400 border-cyan-400/40';
      case 'FLOP':
        return 'text-purple-400 border-purple-400/40';
      case 'TURN':
        return 'text-orange-400 border-orange-400/40';
      case 'RIVER':
        return 'text-red-400 border-red-400/40';
      default:
        return 'text-white/60 border-white/20';
    }
  }, []);

  const phaseLabels: Record<string, string> = {
    PREFLOP: 'Pre-Flop',
    FLOP: 'Flop',
    TURN: 'Turn',
    RIVER: 'River',
  };

  const rec = display?.recommendation;
  const gs = display?.gameState;
  const actionType = rec?.action_type;

  return (
    <div className="relative w-full space-y-3">
      {/* Connection status + FPS */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'}`}
          />
          <span className="text-xs text-white/50">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          FPS: {currentFps}
        </button>
      </div>

      {/* Recommendation card */}
      {rec && gs ? (
        <div
          className={`rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-xl p-4 transition-all duration-300 ${transitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
        >
          {/* Phase */}
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getPhaseColor(gs.phase)} bg-white/[0.04]`}
            >
              {phaseLabels[gs.phase] ?? gs.phase}
            </span>
            <span className="text-xs text-white/40">
              Bote: {gs.pot.toLocaleString()} • BB: {gs.big_blind}
            </span>
          </div>

          {/* Action */}
          <div
            className={`rounded-xl border px-4 py-3 mb-3 flex items-center justify-between ${actionType ? ACTION_COLORS[actionType] : 'bg-white/[0.04] border-white/[0.08]'}`}
          >
            <div>
              <span className="text-white font-bold text-lg">
                {actionType ? ACTION_LABELS[actionType] : '-'}
              </span>
              {rec.bet_amount_chips > 0 && (
                <span className="text-white/70 text-sm ml-2">
                  {rec.bet_amount_chips.toLocaleString()} ({Math.round(rec.bet_amount_pct)}%)
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-white/80 text-sm font-mono">
                {Math.round(rec.confidence * 100)}%
              </span>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="h-1.5 bg-white/[0.08] rounded-full mb-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${rec.confidence >= 0.7 ? 'bg-emerald-400' : rec.confidence >= 0.4 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${Math.round(rec.confidence * 100)}%` }}
            />
          </div>

          {/* Reasoning */}
          {rec.reasoning && (
            <p className="text-white/60 text-xs leading-relaxed mb-3">{rec.reasoning}</p>
          )}

          {/* Equity */}
          <div className="text-xs text-white/40">
            Equity: <span className="text-cyan-400 font-mono">{Math.round(rec.range_equity * 100)}%</span>
          </div>

          {/* Community cards */}
          {gs.community_cards.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-white/40">Comunitarias:</span>
              <div className="flex gap-1">
                {gs.community_cards.map((card, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center justify-center w-7 h-9 rounded-md bg-white/[0.08] border border-white/[0.12] text-xs font-bold ${getSuitColor(card.suit)}`}
                  >
                    {card.rank}
                    {getSuitSymbol(card.suit)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hero cards */}
          {gs.players.find((p) => p.is_hero)?.hole_cards?.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-white/40">Mano:</span>
              <div className="flex gap-1">
                {gs.players
                  .find((p) => p.is_hero)
                  ?.hole_cards.map((card, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center justify-center w-7 h-9 rounded-md bg-white/[0.08] border border-cyan-400/30 text-xs font-bold ${getSuitColor(card.suit)}`}
                    >
                      {card.rank}
                      {getSuitSymbol(card.suit)}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {lastMessage &&
            lastMessage.type === 'recommendation' &&
            lastMessage.errors.length > 0 && (
              <div className="mt-3 p-2 rounded-lg bg-red-900/20 border border-red-500/20">
                <p className="text-red-400 text-xs">
                  {lastMessage.errors.join(', ')}
                </p>
              </div>
            )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-xl p-6 text-center">
          <p className="text-white/40 text-sm">
            {isConnected
              ? 'Esperando datos del backend...'
              : 'Conectando al servidor...'}
          </p>
        </div>
      )}

      {/* Debug overlay */}
      {showDebug && gs && (
        <div className="rounded-xl border border-white/[0.08] bg-black/50 p-3 space-y-1 text-xs font-mono text-white/50">
          <div>Acción en: {gs.action_on}</div>
          <div>Hero: {gs.hero_position}</div>
          <div>Dealer: {gs.dealer_position}</div>
          <div>Apuesta actual: {gs.current_bet}</div>
          <div>Subir mín: {gs.min_raise}</div>
          <div>
            Acciones: {gs.valid_actions?.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}
