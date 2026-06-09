/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-useless-constructor, @typescript-eslint/require-await -- Test mocks require empty constructors and async stubs. */
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { RefreshAllVisibleViewsCommandHandler } from './refresh-all-visible-views-command-handler.ts';

vi.mock('obsidian-dev-utils/obsidian/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: class {
    public constructor(_params: unknown) {
      // Base no-op
    }
  }
}));

interface CommandHandlerPrivate {
  execute(): Promise<void>;
}

function asPrivate(handler: RefreshAllVisibleViewsCommandHandler): CommandHandlerPrivate {
  // eslint-disable-next-line no-restricted-syntax -- Accessing protected methods for testing requires double assertion.
  return handler as unknown as CommandHandlerPrivate;
}

describe('RefreshAllVisibleViewsCommandHandler', () => {
  it('should create an instance', () => {
    const handler = new RefreshAllVisibleViewsCommandHandler({
      refreshAllVisibleViews: async () => undefined
    });
    expect(handler).toBeInstanceOf(RefreshAllVisibleViewsCommandHandler);
  });

  describe('execute', () => {
    it('should call refreshAllVisibleViews', async () => {
      const refreshAllVisibleViews = vi.fn().mockResolvedValue(undefined);
      const handler = new RefreshAllVisibleViewsCommandHandler({ refreshAllVisibleViews });
      await asPrivate(handler).execute();
      expect(refreshAllVisibleViews).toHaveBeenCalled();
    });
  });
});
/* eslint-enable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-useless-constructor, @typescript-eslint/require-await -- End of test file. */
