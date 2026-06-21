import type { View } from 'obsidian';

import { noopAsync } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { RefreshActiveViewCommandHandler } from './refresh-active-view-command-handler.ts';

interface ExecutableHandler {
  execute(): Promise<void>;
}

describe('RefreshActiveViewCommandHandler', () => {
  it('should build a command with the expected id, name and icon', () => {
    const handler = new RefreshActiveViewCommandHandler({
      getActiveView: (): null => null,
      refreshView: noopAsync
    });
    const command = handler.buildCommand();
    expect(command.id).toBe('refresh-active-view');
    expect(command.name).toBe('Refresh active view');
    expect(command.icon).toBe('refresh-ccw');
  });

  describe('canExecute (via checkCallback)', () => {
    it('should report unavailable when there is no active view', () => {
      const handler = new RefreshActiveViewCommandHandler({
        getActiveView: (): null => null,
        refreshView: noopAsync
      });
      expect(handler.buildCommand().checkCallback?.(true)).toBe(false);
    });

    it('should report available when there is an active view', () => {
      const view = strictProxy<View>({});
      const handler = new RefreshActiveViewCommandHandler({
        getActiveView: (): View => view,
        refreshView: noopAsync
      });
      expect(handler.buildCommand().checkCallback?.(true)).toBe(true);
    });
  });

  describe('execute (via checkCallback)', () => {
    it('should call refreshView with the active view', async () => {
      const view = strictProxy<View>({});
      const refreshView = vi.fn((): Promise<void> => noopAsync());
      const handler = new RefreshActiveViewCommandHandler({
        getActiveView: (): View => view,
        refreshView
      });
      handler.buildCommand().checkCallback?.(false);
      await noopAsync();
      expect(refreshView).toHaveBeenCalledWith(view);
    });

    it('should not run when there is no active view', async () => {
      const refreshView = vi.fn((): Promise<void> => noopAsync());
      const handler = new RefreshActiveViewCommandHandler({
        getActiveView: (): null => null,
        refreshView
      });
      expect(handler.buildCommand().checkCallback?.(false)).toBe(false);
      await noopAsync();
      expect(refreshView).not.toHaveBeenCalled();
    });

    it('should be a no-op when the active view disappears before execute runs', async () => {
      // `checkCallback` guards `execute` behind `canExecute`, so the `if (view)` guard inside `execute`
      // Is only reachable if the active view vanishes between the two calls. Invoke the handler's own
      // Protected `execute` directly to cover that defensive branch.
      const refreshView = vi.fn((): Promise<void> => noopAsync());
      const handler = new RefreshActiveViewCommandHandler({
        getActiveView: (): null => null,
        refreshView
      });
      await castTo<ExecutableHandler>(handler).execute();
      expect(refreshView).not.toHaveBeenCalled();
    });
  });
});
