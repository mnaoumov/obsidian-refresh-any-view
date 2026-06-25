import { waitForAllAsyncOperations } from 'obsidian-dev-utils/async';
import { noopAsync } from 'obsidian-dev-utils/function';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RefreshAnyViewComponent } from '../refresh-any-view-component.ts';

import { RefreshAllOpenViewsCommandHandler } from './refresh-all-open-views-command-handler.ts';

describe('RefreshAllOpenViewsCommandHandler', () => {
  it('should build a command with the expected id, name and icon', () => {
    const handler = new RefreshAllOpenViewsCommandHandler({
      refreshAnyViewComponent: strictProxy<RefreshAnyViewComponent>({
        refreshAllOpenViews: (): Promise<void> => noopAsync()
      })
    });
    const command = handler.buildCommand();
    expect(command.id).toBe('refresh-all-open-views');
    expect(command.name).toBe('Refresh all open views');
    expect(command.icon).toBe('refresh-ccw');
  });

  describe('execute (via checkCallback)', () => {
    it('should call refreshAllOpenViews', async () => {
      const refreshAllOpenViews = vi.fn((): Promise<void> => noopAsync());
      const handler = new RefreshAllOpenViewsCommandHandler({
        refreshAnyViewComponent: strictProxy<RefreshAnyViewComponent>({ refreshAllOpenViews })
      });
      expect(handler.buildCommand().checkCallback?.(false)).toBe(true);
      await waitForAllAsyncOperations();
      expect(refreshAllOpenViews).toHaveBeenCalled();
    });
  });
});
