export interface Card {
  rank: string;
  suit: string;
}

export type PlayerPosition = 'BTN' | 'SB' | 'BB';

export type GamePhase = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER';

export type ActionType = 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL_IN';

export interface PlayerState {
  position: PlayerPosition;
  stack: number;
  hole_cards: Card[];
  is_hero: boolean;
  is_active: boolean;
}

export interface GameState {
  phase: GamePhase;
  players: PlayerState[];
  community_cards: Card[];
  pot: number;
  current_bet: number;
  min_raise: number;
  big_blind: number;
  hero_position: PlayerPosition;
  dealer_position: PlayerPosition;
  action_on: PlayerPosition;
  valid_actions: ActionType[];
}

export interface StrategyRecommendation {
  action_type: ActionType;
  bet_amount_pct: number;
  bet_amount_chips: number;
  confidence: number;
  reasoning: string;
  range_equity: number;
}

export interface CalibrationRegion {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface CalibrationData {
  regions: CalibrationRegion[];
  imageWidth: number;
  imageHeight: number;
  room_name: string;
}

export type AppMode = 'IDLE' | 'STREAMING' | 'CALIBRATING';

export type WsMessage =
  | {
      type: 'recommendation';
      detected_state: GameState;
      recommendation: StrategyRecommendation;
      processing_time_ms: number;
      errors: string[];
    }
  | { type: 'pong' }
  | { type: 'calibration_ack' }
  | { type: 'error'; data: { message: string } };
