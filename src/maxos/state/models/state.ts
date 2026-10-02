import type { JsonObject } from '../../types';
import { isJsonObject } from '../../stable';

export type StateModel<T> = {
  key: string;
  version: number;
  value: T;
  appliedTransitions: string[];
};

export type StateTransition<T> = {
  id: string;
  key: string;
  expectedVersion: number;
  next: T;
};

export type UniverseState = JsonObject & { started: boolean; tick: number };
export type SIMMode = 'idle' | 'planning' | 'running' | 'paused' | 'error';
export type SIMStatus = 'connected' | 'not_connected';

export type SIMState = JsonObject & {
  lastEnvelopeId: string | null;
  memory: JsonObject;
  steps: number;
  mode?: SIMMode;
  lastOp?: string | null;
  lastCalc?: string | null;
  lastMap?: string | null;
  lastPipe?: string | null;
  lastExpand?: string | null;
  lastBuild?: string | null;
  global?: JsonObject;
  status?: SIMStatus;
};

export type NormalizedSIMState = SIMState & {
  mode: SIMMode;
  lastOp: string | null;
  lastCalc: string | null;
  lastMap: string | null;
  lastPipe: string | null;
  lastExpand: string | null;
  lastBuild: string | null;
  global: JsonObject;
  status: SIMStatus;
};

const SIM_MODES: readonly SIMMode[] = ['idle', 'planning', 'running', 'paused', 'error'];
const SIM_STATUSES: readonly SIMStatus[] = ['connected', 'not_connected'];

function nullableString(value: unknown): string | null {
  return value === null || typeof value === 'string' ? value : null;
}

export function normalizeSIMState(raw: Partial<SIMState> | null): NormalizedSIMState {
  const base = raw ?? {};
  const mode = SIM_MODES.includes(base.mode as SIMMode) ? base.mode as SIMMode : 'idle';
  const status = SIM_STATUSES.includes(base.status as SIMStatus)
    ? base.status as SIMStatus
    : 'not_connected';
  return {
    ...base,
    lastEnvelopeId: base.lastEnvelopeId ?? null,
    memory: isJsonObject(base.memory) ? base.memory : {},
    steps: typeof base.steps === 'number' && Number.isInteger(base.steps) && base.steps >= 0 ? base.steps : 0,
    mode,
    lastOp: nullableString(base.lastOp),
    lastCalc: nullableString(base.lastCalc),
    lastMap: nullableString(base.lastMap),
    lastPipe: nullableString(base.lastPipe),
    lastExpand: nullableString(base.lastExpand),
    lastBuild: nullableString(base.lastBuild),
    global: isJsonObject(base.global) ? base.global : {},
    status,
  };
}

/** Validate both legacy state and the complete normalized behavior shape. */
export function validateSIMState(state: SIMState): state is NormalizedSIMState {
  return isJsonObject(state)
    && (typeof state.lastEnvelopeId === 'string' || state.lastEnvelopeId === null)
    && isJsonObject(state.memory)
    && typeof state.steps === 'number'
    && Number.isInteger(state.steps)
    && state.steps >= 0
    && typeof state.mode === 'string'
    && SIM_MODES.includes(state.mode as SIMMode)
    && [state.lastOp, state.lastCalc, state.lastMap, state.lastPipe, state.lastExpand, state.lastBuild]
      .every((value) => value === null || typeof value === 'string')
    && isJsonObject(state.global)
    && SIM_STATUSES.includes(state.status as SIMStatus);
}

export type TECState = JsonObject & { actionCount: number; executions: number; lastEnvelopeId: string };
export type SessionState = JsonObject & { envelopeId: string; identityId: string; lane?: string; reservation?: string; reservationExpiresAt?: number; reservationToken?: string; sessionId: string };

export function isUniverseState(value: unknown): value is UniverseState {
  return isJsonObject(value) && typeof value.started === 'boolean' && typeof value.tick === 'number' && Number.isInteger(value.tick) && value.tick >= 0;
}

export function isSIMState(value: unknown): value is SIMState {
  return isJsonObject(value) && validateSIMState(value as SIMState);
}

export function isTECState(value: unknown): value is TECState {
  return isJsonObject(value) && typeof value.actionCount === 'number' && Number.isInteger(value.actionCount) && value.actionCount >= 0 && typeof value.executions === 'number' && Number.isInteger(value.executions) && value.executions >= 0 && typeof value.lastEnvelopeId === 'string';
}

export function isSessionState(value: unknown): value is SessionState {
  return isJsonObject(value) && typeof value.envelopeId === 'string' && typeof value.identityId === 'string' && (value.lane === undefined || typeof value.lane === 'string') && (value.reservation === undefined || typeof value.reservation === 'string') && (value.reservationExpiresAt === undefined || (typeof value.reservationExpiresAt === 'number' && Number.isFinite(value.reservationExpiresAt))) && (value.reservationToken === undefined || typeof value.reservationToken === 'string') && typeof value.sessionId === 'string';
}
