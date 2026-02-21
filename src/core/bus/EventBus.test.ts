import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from './EventBus';
import * as GameDocumentStore from '../state/GameDocumentStore';
import { runtimeState } from '../state/RuntimeState';

describe('EventBus', () => {
    let mockReconciler: any;
    let bus: EventBus;

    beforeEach(() => {
        mockReconciler = { reconcile: vi.fn() };
        bus = new EventBus(mockReconciler as any);
        vi.clearAllMocks();
        runtimeState.reset();
        runtimeState.isPlaying = true;
    });

    it('reads subscriptions from the GameDocument and executes an increment action', () => {
        vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue({
            activeScene: 'level_1',
            scenes: {
                level_1: {
                    nodes: [],
                    subscriptions: [
                        { on: 'on_click', actions: [{ type: 'increment', target: 'score', value: 10 }] }
                    ]
                }
            }
        } as any);

        runtimeState.initVariables({ score: 0 });

        bus.publish('on_click');

        expect(runtimeState.getVariable('score')).toBe(10);
    });

    it('executes destroy_node action and triggers reconciler', () => {
        vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue({
            activeScene: 'level_1',
            scenes: {
                level_1: {
                    nodes: [],
                    subscriptions: [
                        { on: 'on_click', actions: [{ type: 'destroy_node', target: 'box_1' }] }
                    ]
                }
            }
        } as any);

        const markDestroyedSpy = vi.spyOn(runtimeState, 'markDestroyed');

        bus.publish('on_click');

        expect(markDestroyedSpy).toHaveBeenCalledWith('box_1');
        expect(mockReconciler.reconcile).toHaveBeenCalledTimes(1);
    });

    it('ignores events with no matching subscriptions', () => {
        vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue({
            activeScene: 'level_1',
            scenes: {
                level_1: {
                    nodes: [],
                    subscriptions: [
                        { on: 'on_click', actions: [{ type: 'increment', target: 'score', value: 10 }] }
                    ]
                }
            }
        } as any);

        runtimeState.initVariables({ score: 0 });

        // Publish an unrelated event
        bus.publish('something_else');

        expect(runtimeState.getVariable('score')).toBe(0); // Should remain 0
    });
});
