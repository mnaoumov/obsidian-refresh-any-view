import { noopAsync } from 'obsidian-dev-utils/function';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { RefreshAllOpenViewsCommandHandler } from './refresh-all-open-views-command-handler.ts';

describe('RefreshAllOpenViewsCommandHandler', () => {
  it('should build a command with the expected id, name and icon', () => {
    const handler = new RefreshAllOpenViewsCommandHandler({
      refreshAllOpenViews: noopAsync
    });
    const command = handler.buildCommand();
    expect(command.id).toBe('refresh-all-open-views');
    expect(command.name).toBe('Refresh all open views');
    expect(command.icon).toBe('refresh-ccw');
  });

  describe('execute (via checkCallback)', () => {
    it('should call refreshAllOpenViews', async () => {
      const refreshAllOpenViews = vi.fn((): Promise<void> => noopAsync());
      const handler = new RefreshAllOpenViewsCommandHandler({ refreshAllOpenViews });
      expect(handler.buildCommand().checkCallback?.(false)).toBe(true);
      await noopAsync();
      expect(refreshAllOpenViews).toHaveBeenCalled();
    });
  });
});
