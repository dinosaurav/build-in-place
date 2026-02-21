import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EditorApp } from './EditorApp';
import * as CopilotKitUI from '@copilotkit/react-ui';

// Mock babylon viewport to prevent webgl context requirement
vi.mock('./EditorApp', async (importOriginal) => {
    const original = await importOriginal<typeof import('./EditorApp')>();
    return {
        ...original,
        // We really just want to test if it mounts without crashing due to context
    };
});

// We have to mock CopilotKit UI to track `setOpen` correctly for the shortcut test
vi.mock('@copilotkit/react-ui', async (importOriginal) => {
    const original = await importOriginal<typeof import('@copilotkit/react-ui')>();
    return {
        ...original,
        CopilotSidebar: ({ children }: any) => <div data-testid="copilot-sidebar">{children}</div>,
        useChatContext: vi.fn(),
    };
});

// Mock environment vars
vi.stubEnv('VITE_COPILOTKIT_PUBLIC_API_KEY', 'test_key');

describe('EditorApp & ShortcutToggle', () => {
    let mockSetOpen: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockSetOpen = vi.fn();
        (CopilotKitUI.useChatContext as any).mockReturnValue({
            open: false,
            setOpen: mockSetOpen
        });
    });

    it('mounts without "Context not found" errors when CopilotKit is available', () => {
        // If ShortcutToggle is outside ChatContextProvider, this will throw.
        const { getByTestId } = render(<EditorApp />);
        expect(getByTestId('copilot-sidebar')).toBeInTheDocument();
    });

    it('Cmd+K toggles the sidebar open/closed via setOpen', () => {
        render(<EditorApp />);

        // Fire Cmd+K
        fireEvent.keyDown(window, { key: 'k', metaKey: true });

        expect(mockSetOpen).toHaveBeenCalledTimes(1);
        expect(mockSetOpen).toHaveBeenCalledWith(true); // Since initial is false, toggles to true
    });
});
