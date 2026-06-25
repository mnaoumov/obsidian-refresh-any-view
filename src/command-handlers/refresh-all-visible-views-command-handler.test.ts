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

import { RefreshAllVisibleViewsCommandHandler } from './refresh-all-visible-views-command-handler.ts';

describe('RefreshAllVisibleViewsCommandHandler', () => {
  it('should build a command with the expected id, name and icon', () => {
    const handler = new RefreshAllVisibleViewsCommandHandler({
      refreshAnyViewComponent: strictProxy<RefreshAnyViewComponent>({
        refreshAllVisibleViews: (): Promise<void> => noopAsync()
      })
    });
    const command = handler.buildCommand();
    expect(command.id).toBe('refresh-all-visible-views');
    expect(command.name).toBe('Refresh all visible views');
    expect(command.icon).toBe('refresh-ccw');
  });

  describe('execute (via checkCallback)', () => {
    it('should call refreshAllVisibleViews', async () => {
      const refreshAllVisibleViews = vi.fn((): Promise<void> => noopAsync());
      const handler = new RefreshAllVisibleViewsCommandHandler({
        refreshAnyViewComponent: strictProxy<RefreshAnyViewComponent>({ refreshAllVisibleViews })
      });
      expect(handler.buildCommand().checkCallback?.(false)).toBe(true);
      await waitForAllAsyncOperations();
      expect(refreshAllVisibleViews).toHaveBeenCalled();
    });
  });
});
