import { describe, expect, it } from 'vitest';
import { normalizeSIMState } from '../../src/maxos/state/models/state';
import { SIMLane } from '../../src/maxos/sim/lane';
import { Substrate } from '../../src/maxos/state/substrate';

describe('SIM introspection behavior', () => {
  it('normalizes legacy SIM state into the full behavior shape', () => {
    const state = normalizeSIMState({ memory: {} });
    expect(state.mode).toBe('idle');
    expect(state.lastOp).toBeNull();
    expect(state.global).toEqual({});
  });

  it('returns a snake_case behavior snapshot', async () => {
    const substrate = new Substrate();
    substrate.readSIM = async () => normalizeSIMState({
      mode: 'running', lastOp: 'calc', lastCalc: 'calc_last', lastMap: 'map_last',
      lastPipe: 'pipe_last', lastExpand: 'expand_last', lastBuild: 'build_last',
      global: { x: 1 }, status: 'connected',
    });

    const result = await new SIMLane(substrate).handleIntrospectionBehavior();
    expect(result.mode).toBe('running');
    expect(result.last_op).toBe('calc');
    expect(result.last_calc).toBe('calc_last');
    expect(result.last_map).toBe('map_last');
    expect(result.last_pipe).toBe('pipe_last');
    expect(result.last_expand).toBe('expand_last');
    expect(result.last_build).toBe('build_last');
    expect(result.global_state).toEqual({ x: 1 });
    expect(result.status).toBe('connected');
  });
});
