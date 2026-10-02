import { mergeJson, stableClone } from '../stable';
import type { Substrate } from '../state/substrate';
import { normalizeSIMState, type SIMState, type StateModel } from '../state/models/state';
import type { Envelope, JsonObject, SIMResponse } from '../types';
import type { BeforeLaneCommit } from '../routing/types';

function stateKey(envelope?: Envelope): string {
  return `sim:${envelope?.sessionId ?? envelope?.identity.id ?? 'default'}`;
}

export class SIMLane {
  constructor(private readonly substrate: Substrate) {}

  async handleIntrospectionBehavior(envelope?: Envelope): Promise<JsonObject> {
    const state = await this.substrate.readSIM(stateKey(envelope));
    const sim = normalizeSIMState(state?.value ?? null);
    return stableClone({
      mode: sim.mode,
      last_op: sim.lastOp,
      last_calc: sim.lastCalc,
      last_map: sim.lastMap,
      last_pipe: sim.lastPipe,
      last_expand: sim.lastExpand,
      last_build: sim.lastBuild,
      global_state: sim.global,
      status: sim.status,
    });
  }
}

export async function maintainSIMState(envelope: Envelope, substrate: Substrate, beforeCommit?: BeforeLaneCommit): Promise<StateModel<SIMState>> {
  const key = stateKey(envelope);
  const current = await substrate.readSIM(key);
  const next = normalizeSIMState({
    ...current?.value,
    lastEnvelopeId: envelope.id,
    memory: mergeJson(current?.value.memory ?? {}, envelope.payload),
    steps: (current?.value.steps ?? 0) + 1,
    mode: current?.value.mode ?? 'running',
    status: 'connected',
  });
  await beforeCommit?.();
  return substrate.transitionSIM({ id: `sim:${envelope.id}`, key, expectedVersion: current?.version ?? 0, next });
}

export function produceSIMOutput(state: StateModel<SIMState>): JsonObject {
  return stableClone({
    lastEnvelopeId: state.value.lastEnvelopeId,
    memory: state.value.memory,
    steps: state.value.steps,
    mode: state.value.mode,
    last_op: state.value.lastOp,
    last_calc: state.value.lastCalc,
    last_map: state.value.lastMap,
    last_pipe: state.value.lastPipe,
    last_expand: state.value.lastExpand,
    last_build: state.value.lastBuild,
    global_state: state.value.global ?? {},
    status: state.value.status ?? 'connected',
  });
}

export function attachSIMMetadata(response: SIMResponse): SIMResponse {
  return { ...response, metadata: { ...response.metadata, deterministic: true, stateful: true } };
}

export async function processSIMEnvelope(envelope: Envelope, substrate: Substrate, beforeCommit?: BeforeLaneCommit): Promise<SIMResponse> {
  const state = await maintainSIMState(envelope, substrate, beforeCommit);
  return attachSIMMetadata({ ok: true, envelopeId: envelope.id, lane: 'sim', stateVersion: state.version, data: produceSIMOutput(state), metadata: {} });
}
