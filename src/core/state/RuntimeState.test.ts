import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { runtimeState } from './RuntimeState';

describe('RuntimeState', () => {
    beforeEach(() => {
        // Reset state before each test
        runtimeState.variables.clear();
        runtimeState.isPlaying = false;
        vi.unstubAllGlobals();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes variables from an object', () => {
        runtimeState.initVariables({ score: 0, health: 100 });

        expect(runtimeState.getVariable('score')).toBe(0);
        expect(runtimeState.getVariable('health')).toBe(100);
    });

    it('dispatches a CustomEvent when setVariable is called', () => {
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

        runtimeState.setVariable('score', 10);

        expect(runtimeState.getVariable('score')).toBe(10);
        expect(dispatchEventSpy).toHaveBeenCalledTimes(1);

        const eventArgs = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
        expect(eventArgs.type).toBe('runtime:variable_changed');
        expect(eventArgs.detail).toEqual({ key: 'score', value: 10 });
    });

    it('does not dispatch an event if variable value is unchanged', () => {
        runtimeState.initVariables({ score: 10 });
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

        runtimeState.setVariable('score', 10);

        expect(dispatchEventSpy).not.toHaveBeenCalled();
    });
});
