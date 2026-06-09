/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-useless-constructor, @typescript-eslint/require-await -- Test mocks require empty constructors and async stubs. */
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { RefreshAllOpenViewsCommandHandler } from './refresh-all-open-views-command-handler.ts';

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

function asPrivate(handler: RefreshAllOpenViewsCommandHandler): CommandHandlerPrivate {
  // eslint-disable-next-line no-restricted-syntax -- Accessing protected methods for testing requires double assertion.
  return handler as unknown as CommandHandlerPrivate;
}

describe('RefreshAllOpenViewsCommandHandler', () => {
  it('should create an instance', () => {
    const handler = new RefreshAllOpenViewsCommandHandler({
      refreshAllOpenViews: async () => undefined
    });
    expect(handler).toBeInstanceOf(RefreshAllOpenViewsCommandHandler);
  });

  describe('execute', () => {
    it('should call refreshAllOpenViews', async () => {
      const refreshAllOpenViews = vi.fn().mockResolvedValue(undefined);
      const handler = new RefreshAllOpenViewsCommandHandler({ refreshAllOpenViews });
      await asPrivate(handler).execute();
      expect(refreshAllOpenViews).toHaveBeenCalled();
    });
  });
});
/* eslint-enable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-useless-constructor, @typescript-eslint/require-await -- End of test file. */
