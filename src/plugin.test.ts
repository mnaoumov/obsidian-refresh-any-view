import type {
  App as AppOriginal,
  PluginManifest
} from 'obsidian';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RefreshAnyViewComponent } from './refresh-any-view-component.ts';

import { RefreshActiveViewCommandHandler } from './command-handlers/refresh-active-view-command-handler.ts';
import { RefreshAllOpenViewsCommandHandler } from './command-handlers/refresh-all-open-views-command-handler.ts';
import { RefreshAllVisibleViewsCommandHandler } from './command-handlers/refresh-all-visible-views-command-handler.ts';
import { Plugin } from './plugin.ts';
import { RefreshAnyViewComponent as RefreshAnyViewComponentImport } from './refresh-any-view-component.ts';

// Dev-utils COLLABORATOR components added via `addChild` must be loadable (`addChild` eager-loads them).
// We don't need their real behavior here, so stub each as a thin loadable `Component` (allowed double).
interface ObsidianComponentModule {
  Component: new () => object;
}

async function loadableComponentStub(): Promise<ReturnType<typeof vi.fn>> {
  const { Component } = await vi.importActual<ObsidianComponentModule>('obsidian');
  // Vitest requires a non-arrow function for a mock invoked with `new`; it must return a fresh real
  // `Component` so the test-mocks `Component` constructor's strict proxy is not routed through the mock.
  // eslint-disable-next-line prefer-arrow-callback -- vitest needs a non-arrow fn for `new`.
  return vi.fn(function componentStub() {
    return new Component();
  });
}

vi.mock('obsidian-dev-utils/obsidian/components/plugin-settings-tab-component', async () => ({
  PluginSettingsTabComponent: await loadableComponentStub()
}));

vi.mock('obsidian-dev-utils/obsidian/components/menu-event-registrar-component', async () => ({
  MenuEventRegistrarComponent: await loadableComponentStub()
}));

vi.mock('obsidian-dev-utils/obsidian/command-handlers/command-handler-component', async () => ({
  CommandHandlerComponent: await loadableComponentStub()
}));

// Non-child dev-utils collaborators (constructed, not added via `addChild`): plain `vi.fn()` stubs.
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

// The plugin's OWN sibling modules (allowed doubles). `PluginSettingsComponent` and
// `RefreshAnyViewComponent` are `addChild`ed, so they must be loadable `Component`s.
vi.mock('./plugin-settings-component.ts', async () => ({
  PluginSettingsComponent: await loadableComponentStub()
}));

vi.mock('./refresh-any-view-component.ts', async () => ({
  RefreshAnyViewComponent: await loadableComponentStub()
}));

vi.mock('./plugin-settings-tab.ts', () => ({
  PluginSettingsTab: vi.fn()
}));

interface CommandHandlersHolder {
  commandHandlers: unknown[];
}

interface RefreshAnyViewComponentHolder {
  refreshAnyViewComponent: RefreshAnyViewComponent;
}

vi.mock('./command-handlers/refresh-active-view-command-handler.ts', () => ({
  RefreshActiveViewCommandHandler: vi.fn()
}));

vi.mock('./command-handlers/refresh-all-open-views-command-handler.ts', () => ({
  RefreshAllOpenViewsCommandHandler: vi.fn()
}));

vi.mock('./command-handlers/refresh-all-visible-views-command-handler.ts', () => ({
  RefreshAllVisibleViewsCommandHandler: vi.fn()
}));

const manifest: PluginManifest = {
  author: 'test',
  description: 'test',
  id: 'refresh-preview',
  minAppVersion: '1.0.0',
  name: 'Refresh any view',
  version: '1.0.0'
};

let app: AppOriginal;
let loadedPlugin: Plugin | undefined;

describe('Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const appMock = App.createConfigured__();
    appMock.workspace.onLayoutReady = vi.fn((cb: () => void) => {
      cb();
    });
    app = appMock.asOriginalType__();
  });

  afterEach(() => {
    loadedPlugin?.unload();
    loadedPlugin = undefined;
  });

  it('should wire the RefreshAnyViewComponent into all three command handlers', async () => {
    await createLoadedPlugin();

    const refreshAnyViewComponent = castTo<RefreshAnyViewComponent>(vi.mocked(RefreshAnyViewComponentImport).mock.results[0]?.value);
    expect(refreshAnyViewComponent).toBeDefined();

    for (const HandlerClass of [RefreshActiveViewCommandHandler, RefreshAllVisibleViewsCommandHandler, RefreshAllOpenViewsCommandHandler]) {
      expect(vi.mocked(HandlerClass)).toHaveBeenCalledTimes(1);
      const params = castTo<RefreshAnyViewComponentHolder>(vi.mocked(HandlerClass).mock.calls[0]?.[0]);
      expect(params.refreshAnyViewComponent).toBe(refreshAnyViewComponent);
    }
  });

  it('should register all three command handlers with the command handler component', async () => {
    await createLoadedPlugin();

    const params = castTo<CommandHandlersHolder>(vi.mocked(CommandHandlerComponent).mock.calls[0]?.[0]);
    expect(params.commandHandlers).toHaveLength(3);
  });
});

async function createLoadedPlugin(): Promise<Plugin> {
  const plugin = new Plugin(app, manifest);
  await plugin.onload();
  loadedPlugin = plugin;
  return plugin;
}
