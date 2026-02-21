import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameActions } from './useGameActions';
import { useGameStore } from '../../core/state/GameDocumentStore';
import * as CopilotKitCore from '@copilotkit/react-core';

// Mock the store to spy on applyPatch
vi.mock('../../core/state/GameDocumentStore', () => ({
    useGameStore: vi.fn(),
}));

// Mock CopilotKit hook
vi.mock('@copilotkit/react-core', () => ({
    useCopilotAction: vi.fn(),
}));

describe('useGameActions', () => {
    let mockApplyPatch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApplyPatch = vi.fn().mockReturnValue({ success: true });
        (useGameStore as any).mockImplementation((selector: any) => {
            // Mock the selector returning applyPatch
            return mockApplyPatch;
        });
    });

    it('registers the updateGameDocument action with CopilotKit exactly once', () => {
        const useCopilotActionSpy = vi.spyOn(CopilotKitCore, 'useCopilotAction');

        renderHook(() => useGameActions());

        expect(useCopilotActionSpy).toHaveBeenCalledTimes(1);

        const actionConfig = useCopilotActionSpy.mock.calls[0][0] as any;
        expect(actionConfig.name).toBe('updateGameDocument');
        // Ensure dependencies array is present to prevent double execution
        expect((useCopilotActionSpy.mock.calls[0] as any)[1]).toEqual([]);
    });

    it('forwards patches to the GameDocumentStore when the action is executed', async () => {
        const useCopilotActionSpy = vi.spyOn(CopilotKitCore, 'useCopilotAction');
        renderHook(() => useGameActions());

        const actionConfig = useCopilotActionSpy.mock.calls[0][0] as any;
        const mockPatches = [{ op: 'test', path: '/test' }];

        // Execute the registered handler
        await actionConfig.handler({ patches: mockPatches });

        expect(mockApplyPatch).toHaveBeenCalledTimes(1);
        expect(mockApplyPatch).toHaveBeenCalledWith(mockPatches);
    });
});
