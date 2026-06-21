import { noopAsync } from 'obsidian-dev-utils/function';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { RefreshAllVisibleViewsCommandHandler } from './refresh-all-visible-views-command-handler.ts';

describe('RefreshAllVisibleViewsCommandHandler', () => {
  it('should build a command with the expected id, name and icon', () => {
    const handler = new RefreshAllVisibleViewsCommandHandler({
      refreshAllVisibleViews: noopAsync
    });
    const command = handler.buildCommand();
    expect(command.id).toBe('refresh-all-visible-views');
    expect(command.name).toBe('Refresh all visible views');
    expect(command.icon).toBe('refresh-ccw');
  });

  describe('execute (via checkCallback)', () => {
    it('should call refreshAllVisibleViews', async () => {
      const refreshAllVisibleViews = vi.fn((): Promise<void> => noopAsync());
      const handler = new RefreshAllVisibleViewsCommandHandler({ refreshAllVisibleViews });
      expect(handler.buildCommand().checkCallback?.(false)).toBe(true);
      await noopAsync();
      expect(refreshAllVisibleViews).toHaveBeenCalled();
    });
  });
});
