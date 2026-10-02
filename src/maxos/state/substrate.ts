import type { ObservabilityContext } from '../observability/tracing';
import { MaxOsError, SubstrateError } from '../resilience/errors';
import { retry, type RetryPolicy } from '../resilience/retries';
import { substrateTimeout, withTimeout } from '../resilience/timeouts';
import { R2StateRepository } from './adapters/r2';
import { isSessionState, isSIMState, isTECState, isUniverseState, normalizeSIMState, validateSIMState, type SessionState, type SIMState, type StateModel, type StateTransition, type TECState, type UniverseState } from './models/state';
import { InMemoryRepository } from './repositories/memory';
import { createStateCodec, type Repository } from './repositories/repository';

export type SubstrateRepositories = { sessions: Repository<SessionState>; sim: Repository<SIMState>; tec: Repository<TECState>; universe: Repository<UniverseState> };
export type SubstrateOptions = { observability?: ObservabilityContext; retry?: RetryPolicy; timeoutMs?: number };

export class Substrate {
  readonly repositories: SubstrateRepositories;
  readonly observability?: ObservabilityContext;
  private readonly retryPolicy: RetryPolicy;
  private readonly timeoutMs: number;

  constructor(repositories: Partial<SubstrateRepositories> = {}, options: SubstrateOptions = {}) {
    this.repositories = { sessions: repositories.sessions ?? new InMemoryRepository<SessionState>(), sim: repositories.sim ?? new InMemoryRepository<SIMState>(), tec: repositories.tec ?? new InMemoryRepository<TECState>(), universe: repositories.universe ?? new InMemoryRepository<UniverseState>() };
    this.observability = options.observability;
    this.retryPolicy = options.retry ?? { baseDelayMs: 0, maxAttempts: 1 };
    this.timeoutMs = options.timeoutMs ?? 5_000;
  }

  transitionSession(transition: StateTransition<SessionState>) { return this.executeOperation('session.transition', () => this.applyTransition(this.repositories.sessions, transition)); }
  transitionSIM(transition: StateTransition<SIMState>): Promise<StateModel<SIMState>> {
    return this.executeOperation('sim.transition', async () => {
      const next = normalizeSIMState(transition.next);
      if (!validateSIMState(next)) throw new MaxOsError('INVALID_STATE', 'Invalid SIMState after transition', 422);
      return this.applyTransition(this.repositories.sim, { ...transition, next });
    });
  }
  transitionTEC(transition: StateTransition<TECState>) { return this.executeOperation('tec.transition', () => this.applyTransition(this.repositories.tec, transition)); }
  transitionUniverse(transition: StateTransition<UniverseState>) { return this.executeOperation('universe.transition', () => this.applyTransition(this.repositories.universe, transition)); }
  readSession(key: string) { return this.executeOperation('session.read', () => this.repositories.sessions.read(key)); }
  readSIM(key: string): Promise<StateModel<SIMState> | null> { return this.executeOperation('sim.read', async () => { const state = await this.repositories.sim.read(key); return state ? { ...state, value: normalizeSIMState(state.value) } : null; }); }
  readTEC(key: string) { return this.executeOperation('tec.read', () => this.repositories.tec.read(key)); }
  readUniverse(key: string) { return this.executeOperation('universe.read', () => this.repositories.universe.read(key)); }

  private async applyTransition<T>(repository: Repository<T>, transition: StateTransition<T>): Promise<StateModel<T>> {
    const current = await repository.read(transition.key);
    if (current?.appliedTransitions.includes(transition.id)) return current;
    const currentVersion = current?.version ?? 0;
    if (currentVersion !== transition.expectedVersion) throw new MaxOsError('STATE_CONFLICT', `State ${transition.key} version conflict`, 409);
    const next: StateModel<T> = { key: transition.key, version: currentVersion + 1, value: structuredClone(transition.next), appliedTransitions: [...(current?.appliedTransitions ?? []), transition.id] };
    try { return current === null ? await repository.create(next) : await repository.update(next, currentVersion); }
    catch (error) { const latest = error instanceof MaxOsError && error.code === 'STATE_CONFLICT' ? await repository.read(transition.key) : null; if (latest?.appliedTransitions.includes(transition.id)) return latest; throw error; }
  }

  private async executeOperation<T>(operation: string, execute: () => Promise<T>): Promise<T> {
    const span = await this.observability?.trace.startSpan(`substrate.${operation}`);
    const stopTimer = this.observability?.metrics.timer('maxos_substrate_latency_ms', { operation });
    this.observability?.metrics.increment('maxos_substrate_operations_total', { operation });
    try { const result = await retry(() => withTimeout(async () => { try { return await execute(); } catch (error) { if (error instanceof MaxOsError) throw error; throw new SubstrateError('Substrate operation is unavailable', 'SUBSTRATE_UNAVAILABLE', 503, true); } }, { timeoutMs: this.timeoutMs, createError: () => substrateTimeout(this.timeoutMs) }), this.retryPolicy, { shouldRetry: (error) => error instanceof SubstrateError && error.retryable }); stopTimer?.(); return result; }
    catch (error) { stopTimer?.(); this.observability?.metrics.increment('maxos_failures_total', { stage: 'substrate' }); this.observability?.logger.error('substrate.failure', { operation, spanId: span?.spanId }); throw error; }
  }
}

export function createDurableSubstrate(bucket: R2Bucket, options: SubstrateOptions = {}): Substrate { return new Substrate({ sessions: new R2StateRepository(bucket, createStateCodec(isSessionState), 'maxos/sessions/'), sim: new R2StateRepository(bucket, createStateCodec(isSIMState), 'maxos/sim/'), tec: new R2StateRepository(bucket, createStateCodec(isTECState), 'maxos/tec/'), universe: new R2StateRepository(bucket, createStateCodec(isUniverseState), 'maxos/universe/') }, options); }
