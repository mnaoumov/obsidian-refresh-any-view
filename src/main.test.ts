import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin', () => ({
  PluginBase: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/components/monkey-around-component', () => ({
  MonkeyAroundComponent: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/components/plugin-settings-tab-component', () => ({
  PluginSettingsTabComponent: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/components/layout-ready-component', () => ({
  CallbackLayoutReadyComponent: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/components/menu-event-registrar-component', () => ({
  MenuEventRegistrarComponent: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/command-handlers/command-handler-component', () => ({
  CommandHandlerComponent: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/data-handler', () => ({
  PluginDataHandler: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin-event-source', () => ({
  PluginEventSourceImpl: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/command-registrar', () => ({
  PluginCommandRegistrar: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/active-file-provider', () => ({
  AppActiveFileProvider: vi.fn()
}));

vi.mock('obsidian', () => ({
  FileView: vi.fn(),
  ItemView: vi.fn(),
  MarkdownView: vi.fn(),
  Menu: vi.fn(),
  TextFileView: vi.fn(),
  View: vi.fn(),
  WorkspaceLeaf: vi.fn()
}));

vi.mock('./plugin-settings-component.ts', () => ({
  PluginSettingsComponent: vi.fn()
}));

vi.mock('./plugin-settings-tab.ts', () => ({
  PluginSettingsTab: vi.fn()
}));

vi.mock('./command-handlers/refresh-active-view-command-handler.ts', () => ({
  RefreshActiveViewCommandHandler: vi.fn()
}));

vi.mock('./command-handlers/refresh-all-open-views-command-handler.ts', () => ({
  RefreshAllOpenViewsCommandHandler: vi.fn()
}));

vi.mock('./command-handlers/refresh-all-visible-views-command-handler.ts', () => ({
  RefreshAllVisibleViewsCommandHandler: vi.fn()
}));

// eslint-disable-next-line import-x/first, import-x/imports-first -- vi.mock must precede imports.
import Plugin from './main.ts';
// eslint-disable-next-line import-x/first, import-x/imports-first -- vi.mock must precede imports.
import { Plugin as PluginClass } from './plugin.ts';

describe('main', () => {
  it('should export Plugin as default export', () => {
    expect(Plugin).toBe(PluginClass);
  });
});
