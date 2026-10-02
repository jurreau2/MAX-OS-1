import { MaxOsError } from '../errors';
import { SIMLane, processSIMEnvelope } from '../sim/lane';
import type { Substrate } from '../state/substrate';
import { processTECEnvelope } from '../tec/lane';
import type { EnforcedEnvelope, Envelope, LaneResponse } from '../types';
import { adaptEnvelopeToUniverse, adaptUniverseResponse } from '../universe/adapter';
import { routeByEnvelopeType, routeBySIM, routeByTEC, routeByUniverse } from './table';
import type { BeforeLaneCommit, LaneHandlers, RoutedLaneOutput, RoutingEntry } from './types';

const ROUTE_SELECTORS = [routeByEnvelopeType, routeByUniverse, routeBySIM, routeByTEC] as const;
function selectRoute(envelope: Envelope): RoutingEntry | undefined { return ROUTE_SELECTORS.map((selector) => selector(envelope)).find((entry) => entry !== undefined); }
function missingRoute(envelope: Envelope): never { throw new MaxOsError('ROUTE_NOT_FOUND', `No MAX-OS-1 route for ${envelope.type}`, 422); }
function createHandlers(substrate: Substrate): LaneHandlers {
  const simLane = new SIMLane(substrate);
  return {
    identity: async (envelope): Promise<LaneResponse> => ({ ok: true, envelopeId: envelope.id, lane: 'identity', data: envelope.metadata.enforcement.identity, metadata: { deterministic: true } }),
    governance: async (envelope): Promise<LaneResponse> => ({ ok: true, envelopeId: envelope.id, lane: 'governance', data: envelope.metadata.enforcement.governance, metadata: { deterministic: true } }),
    sim: async (envelope, beforeCommit) => envelope.type === 'introspection.sim.behavior' ? { ok: true, envelopeId: envelope.id, lane: 'sim', data: await simLane.handleIntrospectionBehavior(envelope), metadata: { deterministic: true, live: true } } : processSIMEnvelope(envelope, substrate, beforeCommit),
    tec: (envelope, beforeCommit) => processTECEnvelope(envelope, substrate, beforeCommit),
    universe: async (envelope) => { const universeEnvelope = adaptEnvelopeToUniverse(envelope); return adaptUniverseResponse(envelope, universeEnvelope.payload); },
  };
}
export class MaxOsRouter {
  private readonly handlers: LaneHandlers;
  constructor(private readonly substrate: Substrate) { this.handlers = createHandlers(substrate); }
  async routeEnvelope(envelope: EnforcedEnvelope, beforeLaneCommit?: BeforeLaneCommit): Promise<RoutedLaneOutput> { const entry = selectRoute(envelope) ?? missingRoute(envelope); return { entry, output: await this.handlers[entry.lane](envelope, beforeLaneCommit) }; }
}
export function routeEnvelope(envelope: EnforcedEnvelope, substrate: Substrate): Promise<RoutedLaneOutput> { return new MaxOsRouter(substrate).routeEnvelope(envelope); }
