import type {
  App as AppOriginal,
  TAbstractFile,
  View as ViewOriginal,
  WorkspaceLeaf as WorkspaceLeafOriginal
} from 'obsidian';

import { noopAsync } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  App,
  FileView,
  ItemView,
  MarkdownView,
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

import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import {
  AutoRefreshMode,
  PluginSettings
} from './plugin-settings.ts';
import { RefreshAnyViewComponent } from './refresh-any-view-component.ts';

// `getCacheSafe` and `isFile` are dev-utils utilities. Stubbing their RETURN VALUE (not their algorithm)
// Is an allowed test double — the component's branches that depend on them are what we exercise.
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

// The component's OWN settings collaborator. It is passed via the constructor (not `addChild`ed), so a
// Strict-proxy stub carrying a controllable `settings` object and an `on` method that captures the
// `saveSettings` callback is sufficient.
const mockSettings = new PluginSettings();
let capturedSaveSettingsCallback: (() => Promise<void>) | undefined;
const onSaveSettings = vi.fn((_name: string, callback: () => Promise<void>) => {
  capturedSaveSettingsCallback = callback;
  return { asyncEventSource: { offref: vi.fn() } };
});

// The test-mocks view classes are runtime-concrete but typed `abstract` (mirroring Obsidian). Cast to a
// Concrete constructor so the test can instantiate real instances for the source's `instanceof` checks.
const TextFileViewClass = castTo<new (leaf: WorkspaceLeaf) => TextFileView>(TextFileView);
const MarkdownViewClass = castTo<new (leaf: WorkspaceLeaf) => MarkdownView>(MarkdownView);
const FileViewClass = castTo<new (leaf: WorkspaceLeaf) => FileView>(FileView);
const ItemViewClass = castTo<new (leaf: WorkspaceLeaf) => ItemView>(ItemView);

// --- Component private surface (sanctioned `castTo<Testable>` access) ---

type AddActionFn = (icon: string, title: string, callback: () => void) => HTMLElement;

interface LeafStubSpec {
  isDeferred?: boolean;
  isVisible?: boolean;
  loadIfDeferred?(): Promise<void>;
  rebuildView?(): Promise<void>;
  view?: ViewOriginal;
}

interface Testable {
  canAutoRefreshView(view: ViewOriginal): boolean;
  executeKeepingFocus(callback: () => Promise<void>): Promise<void>;
  handleLayoutChange(): void;
  handleModify(file: TAbstractFile): void;
  isMatchingAutoRefreshMode(view: ViewOriginal): boolean;
  isVisibleView(view: ViewOriginal): boolean;
  loadDeferredViews(): Promise<void>;
  onLayoutReady(): Promise<void>;
  refreshViews(condition: (view: ViewOriginal) => boolean): Promise<void>;
  registerAutoRefreshTimer(): void;
}

interface ViewStubMembers {
  containerEl?: HTMLElement;
  getMode?(): string;
  getViewType?(): string;
}

let app: AppOriginal;
let appMock: App;
let loadedComponent: RefreshAnyViewComponent | undefined;
let onWorkspace: ReturnType<typeof vi.fn>;
let onVault: ReturnType<typeof vi.fn>;
let onLayoutReady: ReturnType<typeof vi.fn>;
let getActiveViewOfType: ReturnType<typeof vi.fn>;
let iterateAllLeaves: ReturnType<typeof vi.fn>;
let pluginSettingsComponent: PluginSettingsComponent;

describe('RefreshAnyViewComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSaveSettingsCallback = undefined;
    resetSettings();

    onWorkspace = vi.fn(() => ({ id: 'workspace-event-ref' }));
    onVault = vi.fn(() => ({ id: 'vault-event-ref' }));
    onLayoutReady = vi.fn();
    getActiveViewOfType = vi.fn(() => null);
    iterateAllLeaves = vi.fn();

    appMock = App.createConfigured__();
    appMock.workspace.onLayoutReady = castTo<typeof appMock.workspace.onLayoutReady>(onLayoutReady);
    appMock.workspace.on = castTo<typeof appMock.workspace.on>(onWorkspace);
    appMock.workspace.getActiveViewOfType = castTo<typeof appMock.workspace.getActiveViewOfType>(getActiveViewOfType);
    appMock.workspace.iterateAllLeaves = castTo<typeof appMock.workspace.iterateAllLeaves>(iterateAllLeaves);
    appMock.vault.on = castTo<typeof appMock.vault.on>(onVault);
    app = appMock.asOriginalType__();

    pluginSettingsComponent = strictProxy<PluginSettingsComponent>({
      on: castTo<PluginSettingsComponent['on']>(onSaveSettings),
      settings: mockSettings
    });
  });

  afterEach(() => {
    // Unload the loaded component so the real monkey-around patch its `onLayoutReady` installs on
    // `WorkspaceLeaf.prototype` is removed, preventing cross-test prototype-patch leakage.
    loadedComponent?.unload();
    loadedComponent = undefined;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('onload', () => {
    it('should register the layout-change event', () => {
      createLoadedComponent();
      expect(onWorkspace).toHaveBeenCalledWith('layout-change', expect.any(Function));
    });

    it('should register the layout-ready handler via the base class', () => {
      createLoadedComponent();
      expect(onLayoutReady).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('getActiveView', () => {
    it('should return the active view from the workspace', () => {
      const component = createLoadedComponent();
      const view = strictProxy<ViewOriginal>({});
      getActiveViewOfType.mockReturnValue(view);
      expect(component.getActiveView()).toBe(view);
    });

    it('should return null when there is no active view', () => {
      const component = createLoadedComponent();
      getActiveViewOfType.mockReturnValue(null);
      expect(component.getActiveView()).toBeNull();
    });
  });

  describe('refreshAllOpenViews', () => {
    it('should rebuild every open view (condition always true)', async () => {
      const component = createLoadedComponent();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      leaf.view = createGenericView({}, leaf);
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      await component.refreshAllOpenViews();
      expect(rebuildView).toHaveBeenCalled();
    });
  });

  describe('refreshAllVisibleViews', () => {
    it('should skip non-visible leaves', async () => {
      const component = createLoadedComponent();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ isVisible: false, rebuildView });
      leaf.view = createGenericView({}, leaf);
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      await component.refreshAllVisibleViews();
      expect(rebuildView).not.toHaveBeenCalled();
      expect(iterateAllLeaves).toHaveBeenCalled();
    });

    it('should rebuild visible leaves', async () => {
      const component = createLoadedComponent();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ isVisible: true, rebuildView });
      leaf.view = createGenericView({}, leaf);
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      await component.refreshAllVisibleViews();
      expect(rebuildView).toHaveBeenCalled();
    });
  });

  describe('refreshView', () => {
    it('should load and rebuild a generic view', async () => {
      const component = createLoadedComponent();
      const loadIfDeferred = vi.fn(asyncNoop);
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ loadIfDeferred, rebuildView });
      const view = createGenericView({}, leaf);

      await component.refreshView(view);
      expect(loadIfDeferred).toHaveBeenCalled();
      expect(rebuildView).toHaveBeenCalled();
    });

    it('should save a dirty TextFileView before rebuilding', async () => {
      const component = createLoadedComponent();
      const save = vi.fn(asyncNoop);
      const leaf = createLeafStub({});
      const view = createTextFileView({ dirty: true, save }, leaf);

      await component.refreshView(view);
      expect(save).toHaveBeenCalled();
    });

    it('should not save a clean TextFileView', async () => {
      const component = createLoadedComponent();
      const save = vi.fn(asyncNoop);
      const leaf = createLeafStub({});
      const view = createTextFileView({ dirty: false, save }, leaf);

      await component.refreshView(view);
      expect(save).not.toHaveBeenCalled();
    });

    it('should rerender in preview mode when quick refresh is enabled', async () => {
      const component = createLoadedComponent();
      mockSettings.shouldUseQuickMarkdownViewRefresh = true;
      const rerender = vi.fn();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      const view = createMarkdownView({ mode: 'preview', rerender }, leaf);

      await component.refreshView(view);
      expect(rerender).toHaveBeenCalledWith(true);
      expect(rebuildView).not.toHaveBeenCalled();
    });

    it('should rebuild in preview mode when quick refresh is disabled', async () => {
      const component = createLoadedComponent();
      mockSettings.shouldUseQuickMarkdownViewRefresh = false;
      const rerender = vi.fn();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      const view = createMarkdownView({ mode: 'preview', rerender }, leaf);

      await component.refreshView(view);
      expect(rebuildView).toHaveBeenCalled();
      expect(rerender).not.toHaveBeenCalled();
    });

    it('should dispatch editor changes in source mode when quick refresh is enabled', async () => {
      const component = createLoadedComponent();
      mockSettings.shouldUseQuickMarkdownViewRefresh = true;
      const dispatch = vi.fn();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      const view = createMarkdownView({ dispatch, mode: 'source' }, leaf);

      await component.refreshView(view);
      expect(dispatch).toHaveBeenCalled();
      expect(rebuildView).not.toHaveBeenCalled();
    });

    it('should rebuild in source mode when quick refresh is disabled', async () => {
      const component = createLoadedComponent();
      mockSettings.shouldUseQuickMarkdownViewRefresh = false;
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      const view = createMarkdownView({ mode: 'source' }, leaf);

      await component.refreshView(view);
      expect(rebuildView).toHaveBeenCalled();
    });

    it('should refresh the metadata cache when a MarkdownView has a file', async () => {
      const component = createLoadedComponent();
      mockSettings.shouldUseQuickMarkdownViewRefresh = false;
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      const view = createMarkdownView({ file: { path: 'test.md' }, mode: 'source' }, leaf);

      await component.refreshView(view);
      expect(mockGetCacheSafe).toHaveBeenCalled();
    });
  });

  describe('handleLayoutChange', () => {
    it('should do nothing when there is no active item view', () => {
      const component = createLoadedComponent();
      getActiveViewOfType.mockReturnValue(null);

      testable(component).handleLayoutChange();
      expect(getActiveViewOfType).toHaveBeenCalled();
    });

    it('should add a refresh action for a new item view', () => {
      const component = createLoadedComponent();
      const addAction = vi.fn((): HTMLElement => activeDocument.createElement('button'));
      const itemView = createItemView({ addAction });
      getActiveViewOfType.mockReturnValue(itemView);

      testable(component).handleLayoutChange();
      expect(addAction).toHaveBeenCalledWith('refresh-cw', 'Refresh view', expect.any(Function));
    });

    it('should not add a duplicate action for the same item view', () => {
      const component = createLoadedComponent();
      const addAction = vi.fn((): HTMLElement => activeDocument.createElement('button'));
      const itemView = createItemView({ addAction });
      getActiveViewOfType.mockReturnValue(itemView);

      testable(component).handleLayoutChange();
      testable(component).handleLayoutChange();
      expect(addAction).toHaveBeenCalledTimes(1);
    });

    it('should refresh the view when the action button is clicked', async () => {
      const component = createLoadedComponent();
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      let capturedAction: (() => void) | undefined;
      const addAction = vi.fn((_icon: string, _title: string, callback: () => void): HTMLElement => {
        capturedAction = callback;
        return activeDocument.createElement('button');
      });
      const itemView = createItemView({ addAction, leaf });
      getActiveViewOfType.mockReturnValue(itemView);

      testable(component).handleLayoutChange();
      capturedAction?.();
      await vi.waitFor(() => {
        expect(rebuildView).toHaveBeenCalled();
      });
    });

    it('should remove the action button on cleanup', () => {
      const component = createLoadedComponent();
      const button = activeDocument.createElement('button');
      activeDocument.body.appendChild(button);
      const removeSpy = vi.spyOn(button, 'remove');
      const addAction = vi.fn((): HTMLElement => button);
      const itemView = createItemView({ addAction });
      getActiveViewOfType.mockReturnValue(itemView);

      let capturedCleanup: (() => void) | undefined;
      vi.spyOn(component, 'register').mockImplementation((cleanup: () => void) => {
        capturedCleanup = cleanup;
      });

      testable(component).handleLayoutChange();
      capturedCleanup?.();
      expect(removeSpy).toHaveBeenCalled();
    });
  });

  describe('handleModify', () => {
    it('should do nothing when auto-refresh on file change is disabled', () => {
      const component = createLoadedComponent();
      mockSettings.shouldAutoRefreshOnFileChange = false;

      testable(component).handleModify(castTo<TAbstractFile>({ path: 'test.md' }));
      expect(iterateAllLeaves).not.toHaveBeenCalled();
    });

    it('should do nothing when the modified target is not a file', () => {
      const component = createLoadedComponent();
      mockSettings.shouldAutoRefreshOnFileChange = true;
      mockIsFile.mockReturnValue(false);

      testable(component).handleModify(castTo<TAbstractFile>({ path: 'folder' }));
      expect(iterateAllLeaves).not.toHaveBeenCalled();
    });

    it('should refresh matching FileViews when an open file is modified', async () => {
      const component = createLoadedComponent();
      mockSettings.shouldAutoRefreshOnFileChange = true;
      mockIsFile.mockReturnValue(true);
      const sharedFile = castTo<TAbstractFile>({ path: 'test.md' });
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      leaf.view = createFileView({ file: sharedFile, viewType: 'test' }, leaf);
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      testable(component).handleModify(sharedFile);
      await vi.waitFor(() => {
        expect(rebuildView).toHaveBeenCalled();
      });
    });
  });

  describe('isMatchingAutoRefreshMode', () => {
    it('should return false in Off mode', () => {
      const component = createLoadedComponent();
      mockSettings.autoRefreshMode = AutoRefreshMode.Off;
      expect(testable(component).isMatchingAutoRefreshMode(castTo<ViewOriginal>({}))).toBe(false);
    });

    it('should return true for the active view in ActiveView mode', () => {
      const component = createLoadedComponent();
      mockSettings.autoRefreshMode = AutoRefreshMode.ActiveView;
      const view = castTo<ViewOriginal>({});
      getActiveViewOfType.mockReturnValue(view);
      expect(testable(component).isMatchingAutoRefreshMode(view)).toBe(true);
    });

    it('should return false for a non-active view in ActiveView mode', () => {
      const component = createLoadedComponent();
      mockSettings.autoRefreshMode = AutoRefreshMode.ActiveView;
      getActiveViewOfType.mockReturnValue(castTo<ViewOriginal>({}));
      expect(testable(component).isMatchingAutoRefreshMode(castTo<ViewOriginal>({}))).toBe(false);
    });

    it('should return true in AllOpenViews mode', () => {
      const component = createLoadedComponent();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      expect(testable(component).isMatchingAutoRefreshMode(castTo<ViewOriginal>({}))).toBe(true);
    });

    it('should return true for a visible view in AllVisibleViews mode', () => {
      const component = createLoadedComponent();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllVisibleViews;
      const view = strictProxy<ViewOriginal>({ leaf: strictProxy<WorkspaceLeafOriginal>({ isVisible: () => true }) });
      expect(testable(component).isMatchingAutoRefreshMode(view)).toBe(true);
    });

    it('should return false for a non-visible view in AllVisibleViews mode', () => {
      const component = createLoadedComponent();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllVisibleViews;
      const view = strictProxy<ViewOriginal>({ leaf: strictProxy<WorkspaceLeafOriginal>({ isVisible: () => false }) });
      expect(testable(component).isMatchingAutoRefreshMode(view)).toBe(false);
    });

    it('should return false for an unknown mode via the default branch', () => {
      const component = createLoadedComponent();
      mockSettings.autoRefreshMode = castTo<AutoRefreshMode>('UnknownMode');
      expect(testable(component).isMatchingAutoRefreshMode(castTo<ViewOriginal>({}))).toBe(false);
    });
  });

  describe('isVisibleView', () => {
    it('should reflect the leaf visibility', () => {
      const component = createLoadedComponent();
      const visibleView = strictProxy<ViewOriginal>({ leaf: strictProxy<WorkspaceLeafOriginal>({ isVisible: () => true }) });
      const hiddenView = strictProxy<ViewOriginal>({ leaf: strictProxy<WorkspaceLeafOriginal>({ isVisible: () => false }) });
      expect(testable(component).isVisibleView(visibleView)).toBe(true);
      expect(testable(component).isVisibleView(hiddenView)).toBe(false);
    });
  });

  describe('canAutoRefreshView', () => {
    it('should return false when the view type is excluded', () => {
      const component = createLoadedComponent();
      mockSettings.includeViewTypesForAutoRefresh = ['other'];
      const view = strictProxy<ViewOriginal>({
        getViewType: () => 'some-type',
        leaf: strictProxy<WorkspaceLeafOriginal>({ isDeferred: false })
      });
      expect(testable(component).canAutoRefreshView(view)).toBe(false);
    });

    it('should return false for a deferred leaf when loading deferred views on auto-refresh is disabled', () => {
      const component = createLoadedComponent();
      mockSettings.shouldLoadDeferredViewsOnAutoRefresh = false;
      const view = strictProxy<ViewOriginal>({
        getViewType: () => 'test',
        leaf: strictProxy<WorkspaceLeafOriginal>({ isDeferred: true })
      });
      expect(testable(component).canAutoRefreshView(view)).toBe(false);
    });

    it('should return true for a deferred leaf when loading deferred views on auto-refresh is enabled', () => {
      const component = createLoadedComponent();
      mockSettings.shouldLoadDeferredViewsOnAutoRefresh = true;
      const view = strictProxy<ViewOriginal>({
        getViewType: () => 'test',
        leaf: strictProxy<WorkspaceLeafOriginal>({ isDeferred: true })
      });
      expect(testable(component).canAutoRefreshView(view)).toBe(true);
    });

    it('should return false for a source-mode MarkdownView when source-mode auto-refresh is disabled', () => {
      const component = createLoadedComponent();
      mockSettings.shouldAutoRefreshMarkdownViewInSourceMode = false;
      const leaf = createLeafStub({});
      const view = createMarkdownView({ mode: 'source', viewType: 'markdown' }, leaf);
      expect(testable(component).canAutoRefreshView(view)).toBe(false);
    });

    it('should return true for a source-mode MarkdownView when source-mode auto-refresh is enabled', () => {
      const component = createLoadedComponent();
      mockSettings.shouldAutoRefreshMarkdownViewInSourceMode = true;
      const leaf = createLeafStub({});
      const view = createMarkdownView({ mode: 'source', viewType: 'markdown' }, leaf);
      expect(testable(component).canAutoRefreshView(view)).toBe(true);
    });

    it('should return true for a preview-mode MarkdownView regardless of the source-mode setting', () => {
      const component = createLoadedComponent();
      mockSettings.shouldAutoRefreshMarkdownViewInSourceMode = false;
      const leaf = createLeafStub({});
      const view = createMarkdownView({ mode: 'preview', viewType: 'markdown' }, leaf);
      expect(testable(component).canAutoRefreshView(view)).toBe(true);
    });
  });

  describe('loadDeferredViews', () => {
    it('should return early when loading deferred views on start is disabled', async () => {
      const component = createLoadedComponent();
      mockSettings.shouldLoadDeferredViewsOnStart = false;
      await testable(component).loadDeferredViews();
      expect(iterateAllLeaves).not.toHaveBeenCalled();
    });

    it('should load deferred views when loading deferred views on start is enabled', async () => {
      const component = createLoadedComponent();
      mockSettings.shouldLoadDeferredViewsOnStart = true;
      const loadIfDeferred = vi.fn(asyncNoop);
      const leaf = createLeafStub({ isDeferred: true, loadIfDeferred });
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      vi.useFakeTimers();
      const promise = testable(component).loadDeferredViews();
      await vi.runAllTimersAsync();
      await promise;
      expect(loadIfDeferred).toHaveBeenCalled();
    });
  });

  describe('onLayoutReady', () => {
    it('should register the vault modify event and the saveSettings listener', async () => {
      const component = createLoadedComponent();
      getActiveViewOfType.mockReturnValue(null);

      await testable(component).onLayoutReady();

      expect(onVault).toHaveBeenCalledWith('modify', expect.any(Function));
      expect(capturedSaveSettingsCallback).toBeDefined();
    });

    it('should re-register the auto-refresh timer when settings are saved', async () => {
      const component = createLoadedComponent();
      getActiveViewOfType.mockReturnValue(null);
      await testable(component).onLayoutReady();

      mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      mockSettings.autoRefreshIntervalInSeconds = 1;
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(window, 'setInterval');
      await capturedSaveSettingsCallback?.();
      expect(setIntervalSpy).toHaveBeenCalled();
    });

    it('should install a working onOpenTabHeaderMenu patch on WorkspaceLeaf', async () => {
      const component = createLoadedComponent();
      getActiveViewOfType.mockReturnValue(null);
      const baseSpy = vi.spyOn(castTo<WorkspaceLeafOriginal>(WorkspaceLeaf.prototype), 'onOpenTabHeaderMenu');

      await testable(component).onLayoutReady();

      const leaf = realLeaf();
      leaf.view = castTo<ViewOriginal>({ getViewType: () => 'markdown' });
      const evt = new MouseEvent('click');
      const parentEl = activeDocument.createElement('div');
      castTo<WorkspaceLeafOriginal>(leaf).onOpenTabHeaderMenu(evt, parentEl);

      expect(baseSpy).toHaveBeenCalled();
    });
  });

  describe('registerAutoRefreshTimer', () => {
    it('should not set an interval in Off mode', () => {
      const component = createLoadedComponent();
      mockSettings.autoRefreshMode = AutoRefreshMode.Off;
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(window, 'setInterval');
      testable(component).registerAutoRefreshTimer();
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('should set an interval when not in Off mode', () => {
      const component = createLoadedComponent();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      mockSettings.autoRefreshIntervalInSeconds = 5;
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(window, 'setInterval');
      testable(component).registerAutoRefreshTimer();
      expect(setIntervalSpy).toHaveBeenCalled();
    });

    it('should clear the previous interval when called again', () => {
      const component = createLoadedComponent();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      mockSettings.autoRefreshIntervalInSeconds = 5;
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
      testable(component).registerAutoRefreshTimer();
      testable(component).registerAutoRefreshTimer();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should refresh matching views when the interval fires', async () => {
      const component = createLoadedComponent();
      mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      mockSettings.autoRefreshIntervalInSeconds = 1;
      const rebuildView = vi.fn(asyncNoop);
      const leaf = createLeafStub({ rebuildView });
      leaf.view = createGenericView({ viewType: 'test' }, leaf);
      iterateAllLeaves.mockImplementation((cb: (leaf: WorkspaceLeafOriginal) => void) => {
        cb(leaf);
      });

      vi.useFakeTimers();
      testable(component).registerAutoRefreshTimer();
      await vi.advanceTimersByTimeAsync(1000);
      expect(rebuildView).toHaveBeenCalled();
    });
  });

  describe('executeKeepingFocus', () => {
    it('should run the callback and restore focus to the active element', async () => {
      const component = createLoadedComponent();
      const button = activeDocument.createElement('button');
      activeDocument.body.appendChild(button);
      button.focus();
      const focusSpy = vi.spyOn(button, 'focus');
      const callback = vi.fn(asyncNoop);

      await testable(component).executeKeepingFocus(callback);

      expect(callback).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
      button.remove();
    });

    it('should restore focus even when the callback throws', async () => {
      const component = createLoadedComponent();
      const button = activeDocument.createElement('button');
      activeDocument.body.appendChild(button);
      button.focus();
      const focusSpy = vi.spyOn(button, 'focus');
      const callback = vi.fn((): Promise<void> => Promise.reject(new Error('boom')));

      await expect(testable(component).executeKeepingFocus(callback)).rejects.toThrow('boom');
      expect(focusSpy).toHaveBeenCalled();
      button.remove();
    });

    it('should not focus when the active element is not an HTMLElement', async () => {
      const component = createLoadedComponent();
      vi.spyOn(activeDocument, 'activeElement', 'get').mockReturnValue(null);
      const callback = vi.fn(asyncNoop);

      await testable(component).executeKeepingFocus(callback);
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

function createLoadedComponent(): RefreshAnyViewComponent {
  const component = new RefreshAnyViewComponent({ app, pluginSettingsComponent });
  component.load();
  loadedComponent = component;
  return component;
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

function testable(component: RefreshAnyViewComponent): Testable {
  return castTo<Testable>(component);
}
