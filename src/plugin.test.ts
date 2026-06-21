import type {
  App as AppOriginal,
  PluginManifest,
  TAbstractFile,
  View as ViewOriginal,
  WorkspaceLeaf as WorkspaceLeafOriginal
} from 'obsidian';
import type { GenericVoidFunction } from 'obsidian-dev-utils/function';

import { noopAsync } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  App,
  FileView,
  ItemView,
  MarkdownView,
  Menu,
  TextFileView,
  WorkspaceLeaf
} from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { RefreshActiveViewCommandHandler } from './command-handlers/refresh-active-view-command-handler.ts';
import {
  AutoRefreshMode,
  PluginSettings
} from './plugin-settings.ts';
import { Plugin } from './plugin.ts';

// `getCacheSafe` and `isFile` are dev-utils utilities. Stubbing their RETURN VALUE (not their algorithm)
// Is an allowed test double — the plugin's branches that depend on them are what we exercise.
const mockGetCacheSafe = vi.fn((): Promise<undefined> => Promise.resolve(undefined));
vi.mock('obsidian-dev-utils/obsidian/metadata-cache', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian-dev-utils/obsidian/metadata-cache')>(),
  getCacheSafe: (...args: unknown[]): Promise<undefined> => mockGetCacheSafe(...castTo<[]>(args))
}));

const mockIsFile = vi.fn((_file: unknown): boolean => true);
vi.mock('obsidian-dev-utils/obsidian/file-system', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian-dev-utils/obsidian/file-system')>(),
  isFile: (file: unknown): boolean => mockIsFile(file)
}));

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

// The plugin's OWN settings component. We need a controllable `settings` object and an `on` method that
// Captures the `saveSettings` callback. Make it a loadable `Component` carrying those members.
const mockSettings = new PluginSettings();
let capturedSaveSettingsCallback: (() => Promise<void>) | undefined;

vi.mock('./plugin-settings-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianComponentModule>('obsidian');

  class PluginSettingsComponentStub extends castTo<new () => object>(Component) {
    public on = vi.fn((_name: string, callback: () => Promise<void>) => {
      capturedSaveSettingsCallback = callback;
      return { asyncEventSource: { offref: vi.fn() } };
    });

    public settings = mockSettings;
  }

  return { PluginSettingsComponent: PluginSettingsComponentStub };
});

vi.mock('./plugin-settings-tab.ts', () => ({
  PluginSettingsTab: vi.fn()
}));

let capturedGetActiveView: (() => null | ViewOriginal) | undefined;

interface ActiveViewGetterHolder {
  getActiveView(): null | ViewOriginal;
}

vi.mock('./command-handlers/refresh-active-view-command-handler.ts', () => ({
  // eslint-disable-next-line prefer-arrow-callback -- vitest needs a non-arrow fn for `new`.
  RefreshActiveViewCommandHandler: vi.fn(function refreshActiveViewCommandHandlerStub(params: ActiveViewGetterHolder) {
    capturedGetActiveView = params.getActiveView;
  })
}));

vi.mock('./command-handlers/refresh-all-open-views-command-handler.ts', () => ({
  RefreshAllOpenViewsCommandHandler: vi.fn()
}));

vi.mock('./command-handlers/refresh-all-visible-views-command-handler.ts', () => ({
  RefreshAllVisibleViewsCommandHandler: vi.fn()
}));

// --- Plugin private surface (sanctioned `castTo<Testable>` access) ---

interface Testable {
  canAutoRefreshView(view: ViewOriginal): boolean;
  copyViewTypeToClipboard(viewType: string): Promise<void>;
  executeKeepingFocus(callback: () => Promise<void>): Promise<void>;
  handleLayoutChange(): void;
  handleModify(file: TAbstractFile): void;
  isMatchingAutoRefreshMode(view: ViewOriginal): boolean;
  isVisibleView(view: ViewOriginal): boolean;
  loadDeferredViews(): Promise<void>;
  onLayoutReady(): Promise<void>;
  onOpenTabHeaderMenu(next: GenericVoidFunction, leaf: WorkspaceLeafOriginal, evt: MouseEvent, parentEl: HTMLElement): void;
  refreshAllOpenViews(): Promise<void>;
  refreshAllVisibleViews(): Promise<void>;
  refreshView(view: ViewOriginal): Promise<void>;
  refreshViews(condition: (view: ViewOriginal) => boolean): Promise<void>;
  registerAutoRefreshTimer(): void;
}

// The test-mocks view classes are runtime-concrete but typed `abstract` (mirroring Obsidian). Cast to a
// Concrete constructor so the test can instantiate real instances for the source's `instanceof` checks.
const TextFileViewClass = castTo<new (leaf: WorkspaceLeaf) => TextFileView>(TextFileView);
const MarkdownViewClass = castTo<new (leaf: WorkspaceLeaf) => MarkdownView>(MarkdownView);
const FileViewClass = castTo<new (leaf: WorkspaceLeaf) => FileView>(FileView);
const ItemViewClass = castTo<new (leaf: WorkspaceLeaf) => ItemView>(ItemView);

interface MenuItemTestable {
  onClick__?(evt: unknown): void;
}

interface MenuTestable {
  items__: MenuItemTestable[];
}

const manifest: PluginManifest = {
  author: 'test',
  description: 'test',
  id: 'refresh-preview',
  minAppVersion: '1.0.0',
  name: 'Refresh any view',
  version: '1.0.0'
};

type AddActionFn = (icon: string, title: string, callback: () => void) => HTMLElement;

interface LeafStubSpec {
  isDeferred?: boolean;
  isVisible?: boolean;
  loadIfDeferred?(): Promise<void>;
  rebuildView?(): Promise<void>;
  view?: ViewOriginal;
}

interface ViewStubMembers {
  containerEl?: HTMLElement;
  getMode?(): string;
  getViewType?(): string;
}

let app: AppOriginal;
let appMock: App;
let loadedPlugin: Plugin | undefined;
let onWorkspace: ReturnType<typeof vi.fn>;
let onVault: ReturnType<typeof vi.fn>;
let getActiveViewOfType: ReturnType<typeof vi.fn>;
let iterateAllLeaves: ReturnType<typeof vi.fn>;

describe('Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSaveSettingsCallback = undefined;
    capturedGetActiveView = undefined;
    resetSettings();

    onWorkspace = vi.fn(() => ({ id: 'workspace-event-ref' }));
    onVault = vi.fn(() => ({ id: 'vault-event-ref' }));
    getActiveViewOfType = vi.fn(() => null);
    iterateAllLeaves = vi.fn();

    appMock = App.createConfigured__();
    appMock.workspace.onLayoutReady = vi.fn((cb: () => void) => {
      cb();
    });
    appMock.workspace.on = castTo<typeof appMock.workspace.on>(onWorkspace);
    appMock.workspace.getActiveViewOfType = castTo<typeof appMock.workspace.getActiveViewOfType>(getActiveViewOfType);
    appMock.workspace.iterateAllLeaves = castTo<typeof appMock.workspace.iterateAllLeaves>(iterateAllLeaves);
    appMock.vault.on = castTo<typeof appMock.vault.on>(onVault);
    app = appMock.asOriginalType__();
  });

  afterEach(() => {
    // Unload the loaded plugin so its real monkey-around patch on `WorkspaceLeaf.prototype` is removed,
    // Preventing cross-test prototype-patch leakage.
    loadedPlugin?.unload();
    loadedPlugin = undefined;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('onload', () => {
    it('should register the layout-change event', async () => {
      const plugin = new Plugin(app, manifest);
      await plugin.onload();
      expect(onWorkspace).toHaveBeenCalledWith('layout-change', expect.any(Function));
    });

    it('should wire getActiveView to workspace.getActiveViewOfType', async () => {
      const plugin = new Plugin(app, manifest);
      await plugin.onload();
      expect(vi.mocked(RefreshActiveViewCommandHandler)).toHaveBeenCalled();
      expect(capturedGetActiveView).toBeDefined();

      const activeView = castTo<ViewOriginal>({});
      getActiveViewOfType.mockReturnValue(activeView);
      expect(capturedGetActiveView?.()).toBe(activeView);
    });
  });

  describe('refreshAllOpenViews', () => {
    it('should rebuild every open view (condition always true)', async () => {
      const plugin = await createLoadedPlugin();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      leaf.view = createGenericView({}, leaf);
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      await testable(plugin).refreshAllOpenViews();
      expect(rebuildView).toHaveBeenCalled();
    });
  });

  describe('refreshAllVisibleViews', () => {
    it('should skip non-visible leaves', async () => {
      const plugin = await createLoadedPlugin();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ isVisible: false, rebuildView });
      leaf.view = createGenericView({}, leaf);
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      await testable(plugin).refreshAllVisibleViews();
      expect(rebuildView).not.toHaveBeenCalled();
      expect(iterateAllLeaves).toHaveBeenCalled();
    });

    it('should rebuild visible leaves', async () => {
      const plugin = await createLoadedPlugin();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ isVisible: true, rebuildView });
      leaf.view = createGenericView({}, leaf);
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      await testable(plugin).refreshAllVisibleViews();
      expect(rebuildView).toHaveBeenCalled();
    });
  });

  describe('refreshView', () => {
    it('should load and rebuild a generic view', async () => {
      const plugin = await createLoadedPlugin();
      const loadIfDeferred = vi.fn(asyncNoop);
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ loadIfDeferred, rebuildView });
      const view = createGenericView({}, leaf);

      await testable(plugin).refreshView(view);
      expect(loadIfDeferred).toHaveBeenCalled();
      expect(rebuildView).toHaveBeenCalled();
    });

    it('should save a dirty TextFileView before rebuilding', async () => {
      const plugin = await createLoadedPlugin();
      const save = vi.fn(asyncNoop);
      const leaf = createLeafStub({});
      const view = createTextFileView({ dirty: true, save }, leaf);

      await testable(plugin).refreshView(view);
      expect(save).toHaveBeenCalled();
    });

    it('should not save a clean TextFileView', async () => {
      const plugin = await createLoadedPlugin();
      const save = vi.fn(asyncNoop);
      const leaf = createLeafStub({});
      const view = createTextFileView({ dirty: false, save }, leaf);

      await testable(plugin).refreshView(view);
      expect(save).not.toHaveBeenCalled();
    });

    it('should rerender in preview mode when quick refresh is enabled', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldUseQuickMarkdownViewRefresh = true;
      const rerender = vi.fn();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      const view = createMarkdownView({ mode: 'preview', rerender }, leaf);

      await testable(plugin).refreshView(view);
      expect(rerender).toHaveBeenCalledWith(true);
      expect(rebuildView).not.toHaveBeenCalled();
    });

    it('should rebuild in preview mode when quick refresh is disabled', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldUseQuickMarkdownViewRefresh = false;
      const rerender = vi.fn();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      const view = createMarkdownView({ mode: 'preview', rerender }, leaf);

      await testable(plugin).refreshView(view);
      expect(rebuildView).toHaveBeenCalled();
      expect(rerender).not.toHaveBeenCalled();
    });

    it('should dispatch editor changes in source mode when quick refresh is enabled', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldUseQuickMarkdownViewRefresh = true;
      const dispatch = vi.fn();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      const view = createMarkdownView({ dispatch, mode: 'source' }, leaf);

      await testable(plugin).refreshView(view);
      expect(dispatch).toHaveBeenCalled();
      expect(rebuildView).not.toHaveBeenCalled();
    });

    it('should rebuild in source mode when quick refresh is disabled', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldUseQuickMarkdownViewRefresh = false;
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      const view = createMarkdownView({ mode: 'source' }, leaf);

      await testable(plugin).refreshView(view);
      expect(rebuildView).toHaveBeenCalled();
    });

    it('should refresh the metadata cache when a MarkdownView has a file', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldUseQuickMarkdownViewRefresh = false;
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      const view = createMarkdownView({ file: { path: 'test.md' }, mode: 'source' }, leaf);

      await testable(plugin).refreshView(view);
      expect(mockGetCacheSafe).toHaveBeenCalled();
    });
  });

  describe('handleLayoutChange', () => {
    it('should do nothing when there is no active item view', async () => {
      const plugin = await createLoadedPlugin();
      getActiveViewOfType.mockReturnValue(null);

      testable(plugin).handleLayoutChange();
      expect(getActiveViewOfType).toHaveBeenCalled();
    });

    it('should add a refresh action for a new item view', async () => {
      const plugin = await createLoadedPlugin();
      const addAction = vi.fn((): HTMLElement => activeDocument.createElement('button'));
      const itemView = createItemView({ addAction });
      getActiveViewOfType.mockReturnValue(itemView);

      testable(plugin).handleLayoutChange();
      expect(addAction).toHaveBeenCalledWith('refresh-cw', 'Refresh view', expect.any(Function));
    });

    it('should not add a duplicate action for the same item view', async () => {
      const plugin = await createLoadedPlugin();
      const addAction = vi.fn((): HTMLElement => activeDocument.createElement('button'));
      const itemView = createItemView({ addAction });
      getActiveViewOfType.mockReturnValue(itemView);

      testable(plugin).handleLayoutChange();
      testable(plugin).handleLayoutChange();
      expect(addAction).toHaveBeenCalledTimes(1);
    });

    it('should refresh the view when the action button is clicked', async () => {
      const plugin = await createLoadedPlugin();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      let capturedAction: (() => void) | undefined;
      const addAction = vi.fn((_icon: string, _title: string, callback: () => void): HTMLElement => {
        capturedAction = callback;
        return activeDocument.createElement('button');
      });
      const itemView = createItemView({ addAction, leaf });
      getActiveViewOfType.mockReturnValue(itemView);

      testable(plugin).handleLayoutChange();
      capturedAction?.();
      await vi.waitFor(() => {
        expect(rebuildView).toHaveBeenCalled();
      });
    });

    it('should remove the action button on cleanup', async () => {
      const plugin = await createLoadedPlugin();
      const button = activeDocument.createElement('button');
      activeDocument.body.appendChild(button);
      const removeSpy = vi.spyOn(button, 'remove');
      const addAction = vi.fn((): HTMLElement => button);
      const itemView = createItemView({ addAction });
      getActiveViewOfType.mockReturnValue(itemView);

      let capturedCleanup: (() => void) | undefined;
      vi.spyOn(plugin, 'register').mockImplementation((cleanup: () => void) => {
        capturedCleanup = cleanup;
      });

      testable(plugin).handleLayoutChange();
      capturedCleanup?.();
      expect(removeSpy).toHaveBeenCalled();
    });
  });

  describe('handleModify', () => {
    it('should do nothing when auto-refresh on file change is disabled', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldAutoRefreshOnFileChange = false;

      testable(plugin).handleModify(castTo<TAbstractFile>({ path: 'test.md' }));
      expect(iterateAllLeaves).not.toHaveBeenCalled();
    });

    it('should do nothing when the modified target is not a file', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldAutoRefreshOnFileChange = true;
      mockIsFile.mockReturnValue(false);

      testable(plugin).handleModify(castTo<TAbstractFile>({ path: 'folder' }));
      expect(iterateAllLeaves).not.toHaveBeenCalled();
    });

    it('should refresh matching FileViews when an open file is modified', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldAutoRefreshOnFileChange = true;
      mockIsFile.mockReturnValue(true);
      const sharedFile = castTo<TAbstractFile>({ path: 'test.md' });
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      leaf.view = createFileView({ file: sharedFile, viewType: 'test' }, leaf);
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      testable(plugin).handleModify(sharedFile);
      await vi.waitFor(() => {
        expect(rebuildView).toHaveBeenCalled();
      });
    });
  });

  describe('isMatchingAutoRefreshMode', () => {
    it('should return false in Off mode', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.autoRefreshMode = AutoRefreshMode.Off;
      expect(testable(plugin).isMatchingAutoRefreshMode(castTo<ViewOriginal>({}))).toBe(false);
    });

    it('should return true for the active view in ActiveView mode', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.autoRefreshMode = AutoRefreshMode.ActiveView;
      const view = castTo<ViewOriginal>({});
      getActiveViewOfType.mockReturnValue(view);
      expect(testable(plugin).isMatchingAutoRefreshMode(view)).toBe(true);
    });

    it('should return false for a non-active view in ActiveView mode', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.autoRefreshMode = AutoRefreshMode.ActiveView;
      getActiveViewOfType.mockReturnValue(castTo<ViewOriginal>({}));
      expect(testable(plugin).isMatchingAutoRefreshMode(castTo<ViewOriginal>({}))).toBe(false);
    });

    it('should return true in AllOpenViews mode', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      expect(testable(plugin).isMatchingAutoRefreshMode(castTo<ViewOriginal>({}))).toBe(true);
    });

    it('should return true for a visible view in AllVisibleViews mode', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllVisibleViews;
      const view = strictProxy<ViewOriginal>({ leaf: strictProxy<WorkspaceLeafOriginal>({ isVisible: () => true }) });
      expect(testable(plugin).isMatchingAutoRefreshMode(view)).toBe(true);
    });

    it('should return false for a non-visible view in AllVisibleViews mode', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllVisibleViews;
      const view = strictProxy<ViewOriginal>({ leaf: strictProxy<WorkspaceLeafOriginal>({ isVisible: () => false }) });
      expect(testable(plugin).isMatchingAutoRefreshMode(view)).toBe(false);
    });

    it('should return false for an unknown mode via the default branch', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.autoRefreshMode = castTo<AutoRefreshMode>('UnknownMode');
      expect(testable(plugin).isMatchingAutoRefreshMode(castTo<ViewOriginal>({}))).toBe(false);
    });
  });

  describe('isVisibleView', () => {
    it('should reflect the leaf visibility', async () => {
      const plugin = await createLoadedPlugin();
      const visibleView = strictProxy<ViewOriginal>({ leaf: strictProxy<WorkspaceLeafOriginal>({ isVisible: () => true }) });
      const hiddenView = strictProxy<ViewOriginal>({ leaf: strictProxy<WorkspaceLeafOriginal>({ isVisible: () => false }) });
      expect(testable(plugin).isVisibleView(visibleView)).toBe(true);
      expect(testable(plugin).isVisibleView(hiddenView)).toBe(false);
    });
  });

  describe('canAutoRefreshView', () => {
    it('should return false when the view type is excluded', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.includeViewTypesForAutoRefresh = ['other'];
      const view = strictProxy<ViewOriginal>({
        getViewType: () => 'some-type',
        leaf: strictProxy<WorkspaceLeafOriginal>({ isDeferred: false })
      });
      expect(testable(plugin).canAutoRefreshView(view)).toBe(false);
    });

    it('should return false for a deferred leaf when loading deferred views on auto-refresh is disabled', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldLoadDeferredViewsOnAutoRefresh = false;
      const view = strictProxy<ViewOriginal>({
        getViewType: () => 'test',
        leaf: strictProxy<WorkspaceLeafOriginal>({ isDeferred: true })
      });
      expect(testable(plugin).canAutoRefreshView(view)).toBe(false);
    });

    it('should return true for a deferred leaf when loading deferred views on auto-refresh is enabled', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldLoadDeferredViewsOnAutoRefresh = true;
      const view = strictProxy<ViewOriginal>({
        getViewType: () => 'test',
        leaf: strictProxy<WorkspaceLeafOriginal>({ isDeferred: true })
      });
      expect(testable(plugin).canAutoRefreshView(view)).toBe(true);
    });

    it('should return false for a source-mode MarkdownView when source-mode auto-refresh is disabled', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldAutoRefreshMarkdownViewInSourceMode = false;
      const leaf = createLeafStub({});
      const view = createMarkdownView({ mode: 'source', viewType: 'markdown' }, leaf);
      expect(testable(plugin).canAutoRefreshView(view)).toBe(false);
    });

    it('should return true for a source-mode MarkdownView when source-mode auto-refresh is enabled', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldAutoRefreshMarkdownViewInSourceMode = true;
      const leaf = createLeafStub({});
      const view = createMarkdownView({ mode: 'source', viewType: 'markdown' }, leaf);
      expect(testable(plugin).canAutoRefreshView(view)).toBe(true);
    });

    it('should return true for a preview-mode MarkdownView regardless of the source-mode setting', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldAutoRefreshMarkdownViewInSourceMode = false;
      const leaf = createLeafStub({});
      const view = createMarkdownView({ mode: 'preview', viewType: 'markdown' }, leaf);
      expect(testable(plugin).canAutoRefreshView(view)).toBe(true);
    });
  });

  describe('loadDeferredViews', () => {
    it('should return early when loading deferred views on start is disabled', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldLoadDeferredViewsOnStart = false;
      await testable(plugin).loadDeferredViews();
      expect(iterateAllLeaves).not.toHaveBeenCalled();
    });

    it('should load deferred views when loading deferred views on start is enabled', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.shouldLoadDeferredViewsOnStart = true;
      const loadIfDeferred = vi.fn(asyncNoop);
      const leaf = createLeafStub({ isDeferred: true, loadIfDeferred });
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      vi.useFakeTimers();
      const promise = testable(plugin).loadDeferredViews();
      await vi.runAllTimersAsync();
      await promise;
      expect(loadIfDeferred).toHaveBeenCalled();
    });
  });

  describe('onLayoutReady', () => {
    it('should register the vault modify event and the saveSettings listener', async () => {
      const plugin = await createLoadedPlugin();
      getActiveViewOfType.mockReturnValue(null);

      await testable(plugin).onLayoutReady();

      expect(onVault).toHaveBeenCalledWith('modify', expect.any(Function));
      expect(capturedSaveSettingsCallback).toBeDefined();
    });

    it('should re-register the auto-refresh timer when settings are saved', async () => {
      const plugin = await createLoadedPlugin();
      getActiveViewOfType.mockReturnValue(null);
      await testable(plugin).onLayoutReady();

      mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      mockSettings.autoRefreshIntervalInSeconds = 1;
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(window, 'setInterval');
      await capturedSaveSettingsCallback?.();
      expect(setIntervalSpy).toHaveBeenCalled();
    });

    it('should install a working onOpenTabHeaderMenu patch on WorkspaceLeaf', async () => {
      const plugin = await createLoadedPlugin();
      getActiveViewOfType.mockReturnValue(null);
      // Spy on the bridge-provided base BEFORE patching so the real patch captures it as `next`.
      // The mock `WorkspaceLeaf` type omits this obsidian-typings member (it is added by the bridge),
      // So reach it through the augmented `obsidian` type.
      const baseSpy = vi.spyOn(castTo<WorkspaceLeafOriginal>(WorkspaceLeaf.prototype), 'onOpenTabHeaderMenu');
      await testable(plugin).onLayoutReady();

      const leaf = realLeaf();
      leaf.view = castTo<ViewOriginal>({ getViewType: () => 'markdown' });
      const forEventSpy = vi.spyOn(Menu, 'forEvent');
      const evt = new MouseEvent('click');
      const parentEl = activeDocument.createElement('div');

      castTo<WorkspaceLeafOriginal>(leaf).onOpenTabHeaderMenu(evt, parentEl);

      expect(baseSpy).toHaveBeenCalled();
      const menu = castTo<MenuTestable>(forEventSpy.mock.results[0]?.value);
      expect(menu.items__).toHaveLength(2);
    });
  });

  describe('onOpenTabHeaderMenu', () => {
    it('should chain to next and add two menu items', async () => {
      const plugin = await createLoadedPlugin();
      const next = vi.fn();
      const forEventSpy = vi.spyOn(Menu, 'forEvent');
      const leaf = strictProxy<WorkspaceLeafOriginal>({ view: castTo<ViewOriginal>({ getViewType: () => 'test' }) });
      const evt = new MouseEvent('click');
      const parentEl = activeDocument.createElement('div');

      testable(plugin).onOpenTabHeaderMenu(next, leaf, evt, parentEl);

      expect(next).toHaveBeenCalled();
      const menu = castTo<MenuTestable>(forEventSpy.mock.results[0]?.value);
      expect(menu.items__).toHaveLength(2);
    });

    it('should refresh the leaf view when the first menu item is clicked', async () => {
      const plugin = await createLoadedPlugin();
      const next = vi.fn();
      const forEventSpy = vi.spyOn(Menu, 'forEvent');
      const rebuildView = vi.fn(asyncNoop);
      const innerLeaf = createLeafStub({ rebuildView });
      const view = createGenericView({}, innerLeaf);
      const leaf = strictProxy<WorkspaceLeafOriginal>({ view });
      const evt = new MouseEvent('click');
      const parentEl = activeDocument.createElement('div');

      testable(plugin).onOpenTabHeaderMenu(next, leaf, evt, parentEl);

      const menu = castTo<MenuTestable>(forEventSpy.mock.results[0]?.value);
      const firstItem = menu.items__[0];
      firstItem?.onClick__?.(evt);
      await vi.waitFor(() => {
        expect(rebuildView).toHaveBeenCalled();
      });
    });

    it('should copy the view type to the clipboard when the second menu item is clicked', async () => {
      const plugin = await createLoadedPlugin();
      const next = vi.fn();
      const forEventSpy = vi.spyOn(Menu, 'forEvent');
      const writeText = vi.fn(asyncNoop);
      Object.defineProperty(activeWindow.navigator, 'clipboard', {
        configurable: true,
        value: castTo<Clipboard>({ writeText })
      });
      const leaf = strictProxy<WorkspaceLeafOriginal>({ view: castTo<ViewOriginal>({ getViewType: () => 'test-view' }) });
      const evt = new MouseEvent('click');
      const parentEl = activeDocument.createElement('div');

      testable(plugin).onOpenTabHeaderMenu(next, leaf, evt, parentEl);

      const menu = castTo<MenuTestable>(forEventSpy.mock.results[0]?.value);
      const secondItem = menu.items__[1];
      secondItem?.onClick__?.(evt);
      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('test-view');
      });
    });
  });

  describe('registerAutoRefreshTimer', () => {
    it('should not set an interval in Off mode', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.autoRefreshMode = AutoRefreshMode.Off;
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(window, 'setInterval');
      testable(plugin).registerAutoRefreshTimer();
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('should set an interval when not in Off mode', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      mockSettings.autoRefreshIntervalInSeconds = 5;
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(window, 'setInterval');
      testable(plugin).registerAutoRefreshTimer();
      expect(setIntervalSpy).toHaveBeenCalled();
    });

    it('should clear the previous interval when called again', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      mockSettings.autoRefreshIntervalInSeconds = 5;
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
      testable(plugin).registerAutoRefreshTimer();
      testable(plugin).registerAutoRefreshTimer();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should refresh matching views when the interval fires', async () => {
      const plugin = await createLoadedPlugin();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      mockSettings.autoRefreshIntervalInSeconds = 1;
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      leaf.view = createGenericView({ viewType: 'test' }, leaf);
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      vi.useFakeTimers();
      testable(plugin).registerAutoRefreshTimer();
      await vi.advanceTimersByTimeAsync(1000);
      expect(rebuildView).toHaveBeenCalled();
    });
  });

  describe('executeKeepingFocus', () => {
    it('should run the callback and restore focus to the active element', async () => {
      const plugin = await createLoadedPlugin();
      const button = activeDocument.createElement('button');
      activeDocument.body.appendChild(button);
      button.focus();
      const focusSpy = vi.spyOn(button, 'focus');
      const callback = vi.fn(asyncNoop);

      await testable(plugin).executeKeepingFocus(callback);

      expect(callback).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
      button.remove();
    });

    it('should restore focus even when the callback throws', async () => {
      const plugin = await createLoadedPlugin();
      const button = activeDocument.createElement('button');
      activeDocument.body.appendChild(button);
      button.focus();
      const focusSpy = vi.spyOn(button, 'focus');
      const callback = vi.fn((): Promise<void> => Promise.reject(new Error('boom')));

      await expect(testable(plugin).executeKeepingFocus(callback)).rejects.toThrow('boom');
      expect(focusSpy).toHaveBeenCalled();
      button.remove();
    });

    it('should not focus when the active element is not an HTMLElement', async () => {
      const plugin = await createLoadedPlugin();
      vi.spyOn(activeDocument, 'activeElement', 'get').mockReturnValue(null);
      const callback = vi.fn(asyncNoop);

      await testable(plugin).executeKeepingFocus(callback);
      expect(callback).toHaveBeenCalled();
    });
  });
});

// --- Helpers ---

interface CodeMirrorStub {
  dispatch(): void;
  scrollDOM: ScrollDomStub;
  state: EditorStateStub;
}

interface DocStub {
  length: number;
}

interface EditorStateStub {
  doc: DocStub;
  selection: object;
}

interface FileViewAugment {
  containerEl: HTMLElement;
  file: unknown;
  getViewType(): string;
  leaf: WorkspaceLeafOriginal;
}

interface FileViewSpec {
  file: unknown;
  viewType: string;
}

interface GenericViewSpec extends ViewStubMembers {
  viewType?: string;
}

interface ItemViewAugment {
  addAction: AddActionFn;
  containerEl: HTMLElement;
  getViewType(): string;
  leaf: WorkspaceLeafOriginal;
}

interface ItemViewSpec {
  addAction: AddActionFn;
  leaf?: WorkspaceLeafOriginal;
}

interface MarkdownEditorStub {
  cm: CodeMirrorStub;
}

interface MarkdownViewAugment {
  containerEl: HTMLElement;
  dirty: boolean;
  editor: MarkdownEditorStub;
  file: unknown;
  leaf: WorkspaceLeafOriginal;
  mode: string;
  previewMode: PreviewModeStub;
}

interface MarkdownViewSpec {
  dispatch?(): void;
  file?: unknown;
  mode: string;
  rerender?(): void;
  viewType?: string;
}

interface PreviewModeStub {
  rerender(): void;
}

interface ScrollDomStub {
  scrollTop: number;
}

interface TextFileViewAugment {
  containerEl: HTMLElement;
  dirty: boolean;
  leaf: WorkspaceLeafOriginal;
  save(): Promise<void>;
}

interface TextFileViewSpec {
  dirty: boolean;
  save(): Promise<void>;
}

function asyncNoop(): Promise<void> {
  return noopAsync();
}

function createFileView(spec: FileViewSpec, leaf: WorkspaceLeafOriginal): ViewOriginal {
  const view = new FileViewClass(realLeaf());
  const augmented = castTo<FileViewAugment>(view);
  augmented.file = spec.file;
  augmented.getViewType = (): string => spec.viewType;
  augmented.containerEl = createScrollEl();
  augmented.leaf = leaf;
  return castTo<ViewOriginal>(view);
}

function createGenericView(members: GenericViewSpec, leaf: WorkspaceLeafOriginal): ViewOriginal {
  return strictProxy<ViewOriginal>({
    containerEl: members.containerEl ?? createScrollEl(),
    getViewType: members.getViewType ?? ((): string => members.viewType ?? 'generic'),
    leaf
  });
}

function createItemView(spec: ItemViewSpec): ViewOriginal {
  const leaf = spec.leaf ?? createLeafStub({});
  const view = new ItemViewClass(realLeaf());
  const augmented = castTo<ItemViewAugment>(view);
  augmented.addAction = spec.addAction;
  augmented.containerEl = createScrollEl();
  augmented.getViewType = (): string => 'item';
  augmented.leaf = leaf;
  return castTo<ViewOriginal>(view);
}

function createLeafStub(spec: LeafStubSpec): WorkspaceLeafOriginal {
  return strictProxy<WorkspaceLeafOriginal>({
    isDeferred: spec.isDeferred ?? false,
    isVisible: (): boolean => spec.isVisible ?? false,
    loadIfDeferred: spec.loadIfDeferred ?? asyncNoop,
    rebuildView: spec.rebuildView ?? asyncNoop,
    view: spec.view ?? castTo<ViewOriginal>({})
  });
}

async function createLoadedPlugin(): Promise<Plugin> {
  const plugin = new Plugin(app, manifest);
  await plugin.onload();
  loadedPlugin = plugin;
  return plugin;
}

function createMarkdownView(spec: MarkdownViewSpec, leaf: WorkspaceLeafOriginal): ViewOriginal {
  const view = new MarkdownViewClass(realLeaf());
  const augmented = castTo<MarkdownViewAugment>(view);
  augmented.dirty = false;
  augmented.mode = spec.mode;
  augmented.file = spec.file ?? null;
  augmented.containerEl = createScrollEl();
  augmented.leaf = leaf;
  augmented.previewMode = { rerender: spec.rerender ?? vi.fn() };
  augmented.editor = {
    cm: {
      dispatch: spec.dispatch ?? vi.fn(),
      scrollDOM: { scrollTop: 0 },
      state: { doc: { length: 10 }, selection: {} }
    }
  };
  return castTo<ViewOriginal>(view);
}

function createScrollEl(): HTMLElement {
  return castTo<HTMLElement>({ scrollLeft: 0, scrollTop: 0 });
}

function createTextFileView(spec: TextFileViewSpec, leaf: WorkspaceLeafOriginal): ViewOriginal {
  const view = new TextFileViewClass(realLeaf());
  const augmented = castTo<TextFileViewAugment>(view);
  augmented.dirty = spec.dirty;
  augmented.save = spec.save;
  augmented.containerEl = createScrollEl();
  augmented.leaf = leaf;
  return castTo<ViewOriginal>(view);
}

function realLeaf(): WorkspaceLeaf {
  return WorkspaceLeaf.create2__(appMock);
}

function resetSettings(): void {
  const defaults = new PluginSettings();
  mockSettings.autoRefreshIntervalInSeconds = defaults.autoRefreshIntervalInSeconds;
  mockSettings.autoRefreshMode = defaults.autoRefreshMode;
  mockSettings.excludeViewTypesForAutoRefresh = [];
  mockSettings.includeViewTypesForAutoRefresh = [];
  mockSettings.shouldAutoRefreshMarkdownViewInSourceMode = defaults.shouldAutoRefreshMarkdownViewInSourceMode;
  mockSettings.shouldAutoRefreshOnFileChange = defaults.shouldAutoRefreshOnFileChange;
  mockSettings.shouldLoadDeferredViewsOnAutoRefresh = defaults.shouldLoadDeferredViewsOnAutoRefresh;
  mockSettings.shouldLoadDeferredViewsOnStart = defaults.shouldLoadDeferredViewsOnStart;
  mockSettings.shouldUseQuickMarkdownViewRefresh = defaults.shouldUseQuickMarkdownViewRefresh;
}

function testable(plugin: Plugin): Testable {
  return castTo<Testable>(plugin);
}
