import type { View } from 'obsidian';

import { waitForAllAsyncOperations } from 'obsidian-dev-utils/async';
import { noopAsync } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RefreshAnyViewComponent } from '../refresh-any-view-component.ts';

import { RefreshActiveViewCommandHandler } from './refresh-active-view-command-handler.ts';

interface ExecutableHandler {
  execute(): Promise<void>;
}

interface RefreshAnyViewComponentStubSpec {
  getActiveView?(): null | View;
  refreshView?(view: View): Promise<void>;
}

describe('RefreshActiveViewCommandHandler', () => {
  it('should build a command with the expected id, name and icon', () => {
    const handler = new RefreshActiveViewCommandHandler({
      refreshAnyViewComponent: createRefreshAnyViewComponentStub({})
    });
    const command = handler.buildCommand();
    expect(command.id).toBe('refresh-active-view');
    expect(command.name).toBe('Refresh active view');
    expect(command.icon).toBe('refresh-ccw');
  });

  describe('canExecute (via checkCallback)', () => {
    it('should report unavailable when there is no active view', () => {
      const handler = new RefreshActiveViewCommandHandler({
        refreshAnyViewComponent: createRefreshAnyViewComponentStub({ getActiveView: (): null => null })
      });
      expect(handler.buildCommand().checkCallback?.(true)).toBe(false);
    });

    it('should report available when there is an active view', () => {
      const view = strictProxy<View>({});
      const handler = new RefreshActiveViewCommandHandler({
        refreshAnyViewComponent: createRefreshAnyViewComponentStub({ getActiveView: (): View => view })
      });
      expect(handler.buildCommand().checkCallback?.(true)).toBe(true);
    });
  });

  describe('execute (via checkCallback)', () => {
    it('should call refreshView with the active view', async () => {
      const view = strictProxy<View>({});
      const refreshView = vi.fn((_view: View): Promise<void> => noopAsync());
      const handler = new RefreshActiveViewCommandHandler({
        refreshAnyViewComponent: createRefreshAnyViewComponentStub({
          getActiveView: (): View => view,
          refreshView
        })
      });
      handler.buildCommand().checkCallback?.(false);
      await waitForAllAsyncOperations();
      expect(refreshView).toHaveBeenCalledWith(view);
    });

    it('should not run when there is no active view', async () => {
      const refreshView = vi.fn((_view: View): Promise<void> => noopAsync());
      const handler = new RefreshActiveViewCommandHandler({
        refreshAnyViewComponent: createRefreshAnyViewComponentStub({
          getActiveView: (): null => null,
          refreshView
        })
      });
      expect(handler.buildCommand().checkCallback?.(false)).toBe(false);
      await waitForAllAsyncOperations();
      expect(refreshView).not.toHaveBeenCalled();
    });

    it('should be a no-op when the active view disappears before execute runs', async () => {
      // `checkCallback` guards `execute` behind `canExecute`, so the `if (view)` guard inside `execute`
      // Is only reachable if the active view vanishes between the two calls. Invoke the handler's own
      // Protected `execute` directly to cover that defensive branch.
      const refreshView = vi.fn((_view: View): Promise<void> => noopAsync());
      const handler = new RefreshActiveViewCommandHandler({
        refreshAnyViewComponent: createRefreshAnyViewComponentStub({
          getActiveView: (): null => null,
          refreshView
        })
      });
      await castTo<ExecutableHandler>(handler).execute();
      expect(refreshView).not.toHaveBeenCalled();
    });
  });
});

function createRefreshAnyViewComponentStub(spec: RefreshAnyViewComponentStubSpec): RefreshAnyViewComponent {
  return strictProxy<RefreshAnyViewComponent>({
    getActiveView: spec.getActiveView ?? ((): null => null),
    refreshView: spec.refreshView ?? ((): Promise<void> => noopAsync())
  });
}
