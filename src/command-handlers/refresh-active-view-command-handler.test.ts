/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-useless-constructor, @typescript-eslint/require-await -- Test mocks require empty constructors and async stubs. */
import type { View as ViewOriginal } from 'obsidian';

import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { RefreshActiveViewCommandHandler } from './refresh-active-view-command-handler.ts';

vi.mock('obsidian-dev-utils/obsidian/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: class {
    public constructor(_params: unknown) {
      // Base no-op
    }
  }
}));

interface CommandHandlerPrivate {
  canExecute(): boolean;
  execute(): Promise<void>;
}

function asPrivate(handler: RefreshActiveViewCommandHandler): CommandHandlerPrivate {
  // eslint-disable-next-line no-restricted-syntax -- Accessing protected methods for testing requires double assertion.
  return handler as unknown as CommandHandlerPrivate;
}

describe('RefreshActiveViewCommandHandler', () => {
  it('should create an instance', () => {
    const handler = new RefreshActiveViewCommandHandler({
      getActiveView: () => null,
      refreshView: async () => undefined
    });
    expect(handler).toBeInstanceOf(RefreshActiveViewCommandHandler);
  });

  describe('canExecute', () => {
    it('should return false when there is no active view', () => {
      const handler = new RefreshActiveViewCommandHandler({
        getActiveView: () => null,
        refreshView: async () => undefined
      });
      expect(asPrivate(handler).canExecute()).toBe(false);
    });

    it('should return true when there is an active view', () => {
      const mockView = {} as ViewOriginal;
      const handler = new RefreshActiveViewCommandHandler({
        getActiveView: () => mockView,
        refreshView: async () => undefined
      });
      expect(asPrivate(handler).canExecute()).toBe(true);
    });
  });

  describe('execute', () => {
    it('should call refreshView with the active view', async () => {
      const mockView = {} as ViewOriginal;
      const refreshView = vi.fn().mockResolvedValue(undefined);
      const handler = new RefreshActiveViewCommandHandler({
        getActiveView: () => mockView,
        refreshView
      });
      await asPrivate(handler).execute();
      expect(refreshView).toHaveBeenCalledWith(mockView);
    });

    it('should not call refreshView when there is no active view', async () => {
      const refreshView = vi.fn().mockResolvedValue(undefined);
      const handler = new RefreshActiveViewCommandHandler({
        getActiveView: () => null,
        refreshView
      });
      await asPrivate(handler).execute();
      expect(refreshView).not.toHaveBeenCalled();
    });
  });
});
/* eslint-enable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-useless-constructor, @typescript-eslint/require-await -- End of test file. */
