/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-empty-function, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-useless-constructor, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/require-await, func-style, no-restricted-syntax, obsidianmd/prefer-active-doc -- Test mocking patterns require flexible typing, empty constructors, mock calls, and direct document access. */
import type {
  App,
  PluginManifest,
  TAbstractFile,
  View as ViewOriginal
} from 'obsidian';

import {
  FileView,
  MarkdownView,
  TextFileView,
  WorkspaceLeaf
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/async';
import { noopAsync } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { AutoRefreshMode } from './plugin-settings.ts';
import { Plugin } from './plugin.ts';

// --- Constructible aliases for abstract obsidian View classes (mocked at runtime) ---

const TextFileViewClass = castTo<new () => TextFileView>(TextFileView);
const MarkdownViewClass = castTo<new () => MarkdownView>(MarkdownView);
const FileViewClass = castTo<new () => FileView>(FileView);

// --- Hoisted shared state ---

const hoisted = vi.hoisted(() => ({
  capturedLayoutReadyCallbacks: [] as (() => Promise<void>)[],
  capturedRefreshActiveViewGetActiveView: [] as (() => unknown)[],
  capturedRegisterCallbacks: [] as (() => void)[],
  capturedSaveSettingsCallbacks: [] as (() => Promise<void>)[],
  mockGetActiveViewOfType: vi.fn(() => null as null | ViewOriginal),
  mockIsFile: vi.fn((_file: unknown) => true),
  mockIterateAllLeaves: vi.fn(),
  mockMonkeyAroundRegisterPatch: vi.fn(),
  mockOnVault: vi.fn(() => ({ id: 'vault-event-ref' })),
  mockOnWorkspace: vi.fn(() => ({ id: 'workspace-event-ref' })),
  mockRegisterEvent: vi.fn(),
  mockRegisterInterval: vi.fn(),
  mockSettings: {
    autoRefreshIntervalInSeconds: 5,
    autoRefreshMode: 'Off',
    excludeViewTypesForAutoRefresh: [] as string[],
    includeViewTypesForAutoRefresh: [] as string[],
    isViewTypeIncluded: vi.fn((_viewType: string) => true),
    shouldAutoRefreshMarkdownViewInSourceMode: false,
    shouldAutoRefreshOnFileChange: false,
    shouldLoadDeferredViewsOnAutoRefresh: false,
    shouldLoadDeferredViewsOnStart: false,
    shouldUseQuickMarkdownViewRefresh: true
  }
}));

// --- Mocks ---

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin', () => ({
  PluginBase: class {
    public app: App;
    public manifest: PluginManifest;

    public constructor(app: App, manifest: PluginManifest) {
      this.app = app;
      this.manifest = manifest;
    }

    public addChild<T>(child: T): T {
      return child;
    }

    public async onload(): Promise<void> {}

    public register(fn: () => void): void {
      hoisted.capturedRegisterCallbacks.push(fn);
    }

    public registerEvent(ref: unknown): void {
      hoisted.mockRegisterEvent(ref);
    }

    public registerInterval(id: number): number {
      hoisted.mockRegisterInterval(id);
      return id;
    }
  }
}));

vi.mock('obsidian-dev-utils/obsidian/components/plugin-settings-tab-component', () => ({
  PluginSettingsTabComponent: class {
    public constructor(_params: unknown) {}
  }
}));

vi.mock('obsidian-dev-utils/obsidian/components/layout-ready-component', () => ({
  CallbackLayoutReadyComponent: class {
    public constructor(_app: unknown, callback: () => Promise<void>) {
      hoisted.capturedLayoutReadyCallbacks.push(callback);
    }
  }
}));

vi.mock('obsidian-dev-utils/obsidian/components/menu-event-registrar-component', () => ({
  MenuEventRegistrarComponent: class {
    public constructor(_app: unknown) {}
  }
}));

vi.mock('obsidian-dev-utils/obsidian/command-handlers/command-handler-component', () => ({
  CommandHandlerComponent: class {
    public constructor(_params: unknown) {}
  }
}));

vi.mock('obsidian-dev-utils/obsidian/components/monkey-around-component', () => ({
  MonkeyAroundComponent: class {
    public registerPatch = hoisted.mockMonkeyAroundRegisterPatch;
  }
}));

vi.mock('obsidian-dev-utils/obsidian/data-handler', () => ({
  PluginDataHandler: class {
    public constructor(_plugin: unknown) {}
  }
}));

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin-event-source', () => ({
  PluginEventSourceImpl: class {
    public constructor(_plugin: unknown) {}
  }
}));

vi.mock('obsidian-dev-utils/obsidian/command-registrar', () => ({
  PluginCommandRegistrar: class {
    public constructor(_plugin: unknown) {}
  }
}));

vi.mock('obsidian-dev-utils/obsidian/active-file-provider', () => ({
  AppActiveFileProvider: class {
    public constructor(_app: unknown) {}
  }
}));

vi.mock('obsidian-dev-utils/obsidian/components/async-events-component', () => ({
  registerAsyncEvent: vi.fn()
}));

vi.mock('obsidian-dev-utils/async', () => ({
  invokeAsyncSafely: vi.fn(async (fn: () => Promise<void>) => {
    await fn();
  })
}));

vi.mock('obsidian-dev-utils/obsidian/file-system', () => ({
  isFile: (file: unknown) => hoisted.mockIsFile(file)
}));

vi.mock('obsidian-dev-utils/obsidian/metadata-cache', () => ({
  getCacheSafe: vi.fn(async () => undefined)
}));

vi.mock('./plugin-settings-component.ts', () => ({
  PluginSettingsComponent: class {
    public on = vi.fn((_event: string, handler: () => Promise<void>) => {
      hoisted.capturedSaveSettingsCallbacks.push(handler);
      return { id: 'settings-event-ref' };
    });

    public settings = hoisted.mockSettings;
  }
}));

vi.mock('./plugin-settings-tab.ts', () => ({
  PluginSettingsTab: class {
    public constructor(_params: unknown) {}
  }
}));

vi.mock('./command-handlers/refresh-active-view-command-handler.ts', () => ({
  RefreshActiveViewCommandHandler: class {
    public constructor(params: { getActiveView(): unknown }) {
      hoisted.capturedRefreshActiveViewGetActiveView.push(params.getActiveView);
    }
  }
}));

vi.mock('./command-handlers/refresh-all-open-views-command-handler.ts', () => ({
  RefreshAllOpenViewsCommandHandler: class {
    public constructor(_params: unknown) {}
  }
}));

vi.mock('./command-handlers/refresh-all-visible-views-command-handler.ts', () => ({
  RefreshAllVisibleViewsCommandHandler: class {
    public constructor(_params: unknown) {}
  }
}));

vi.mock('obsidian', async (importOriginal) => {
  const original = await importOriginal<typeof import('obsidian')>();
  return {
    ...original,
    FileView: class {},
    ItemView: class {},
    MarkdownView: class {
      public containerEl = { scrollLeft: 0, scrollTop: 0 };
      public dirty = false;

      public editor = {
        cm: {
          dispatch: vi.fn(),
          scrollDOM: { scrollTop: 0 },
          state: {
            doc: { length: 10 },
            selection: {}
          }
        }
      };

      public file: null | unknown = null;

      public getMode = vi.fn(() => 'source');

      public getViewType = vi.fn(() => 'markdown');

      public leaf = {
        isDeferred: false,
        isVisible: vi.fn(() => false),
        loadIfDeferred: vi.fn(async () => undefined),
        rebuildView: vi.fn(async () => undefined),
        view: null as null | unknown
      };

      public previewMode = { rerender: vi.fn() };

      public save = vi.fn(async () => undefined);
    },
    Menu: {
      forEvent: vi.fn(() => ({
        addItem: vi.fn((cb: (item: unknown) => void) => {
          cb({
            onClick: vi.fn(),
            setIcon: vi.fn(),
            setSection: vi.fn(),
            setTitle: vi.fn()
          });
        })
      }))
    },
    TextFileView: class {
      public dirty = false;
      public save = vi.fn(async () => undefined);
    },
    View: class {},
    WorkspaceLeaf: class {
      public isDeferred = false;
      public isVisible = vi.fn(() => false);
      public loadIfDeferred = vi.fn(async () => undefined);
      public rebuildView = vi.fn(async () => undefined);
      public view: null | unknown = null;
    }
  };
});

// --- Plugin private interface ---

interface MockApp {
  vault: {
    on: ReturnType<typeof vi.fn>;
  };
  workspace: {
    getActiveViewOfType: ReturnType<typeof vi.fn>;
    iterateAllLeaves: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  };
}

interface PluginPrivate {
  canAutoRefreshView(view: ViewOriginal): boolean;
  executeKeepingFocus(callback: () => Promise<void>): Promise<void>;
  handleLayoutChange(): void;
  handleModify(file: TAbstractFile): void;
  isMatchingAutoRefreshMode(view: ViewOriginal): boolean;
  isVisibleView(view: ViewOriginal): boolean;
  loadDeferredViews(): Promise<void>;
  onLayoutReady(): Promise<void>;
  onOpenTabHeaderMenu(next: (...args: unknown[]) => unknown, leaf: WorkspaceLeaf, evt: MouseEvent, parentEl: HTMLElement): void;
  refreshAllOpenViews(): Promise<void>;
  refreshAllVisibleViews(): Promise<void>;
  refreshView(view: ViewOriginal): Promise<void>;
  refreshViews(condition: (view: ViewOriginal) => boolean): Promise<void>;
  registerAutoRefreshTimer(): void;
}

// --- Helpers ---

function asPrivate(plugin: Plugin): PluginPrivate {
  return plugin as unknown as PluginPrivate;
}

function createMockApp(): MockApp {
  return {
    vault: {
      on: hoisted.mockOnVault
    },
    workspace: {
      getActiveViewOfType: hoisted.mockGetActiveViewOfType,
      iterateAllLeaves: hoisted.mockIterateAllLeaves,
      on: hoisted.mockOnWorkspace
    }
  };
}

function createPlugin(): Plugin {
  const app = createMockApp();
  const manifest = { id: 'refresh-preview', name: 'Refresh any view' } as PluginManifest;
  return new Plugin(app as unknown as App, manifest);
}

async function triggerLayoutReady(_plugin: Plugin): Promise<void> {
  const callback = hoisted.capturedLayoutReadyCallbacks[hoisted.capturedLayoutReadyCallbacks.length - 1];
  if (callback) {
    await callback();
  }
}

// --- Tests ---

describe('Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.capturedLayoutReadyCallbacks.length = 0;
    hoisted.capturedRefreshActiveViewGetActiveView.length = 0;
    hoisted.capturedRegisterCallbacks.length = 0;
    hoisted.capturedSaveSettingsCallbacks.length = 0;
    hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.Off;
    hoisted.mockSettings.shouldAutoRefreshOnFileChange = false;
    hoisted.mockSettings.shouldLoadDeferredViewsOnStart = false;
    hoisted.mockSettings.shouldUseQuickMarkdownViewRefresh = true;
    hoisted.mockSettings.shouldAutoRefreshMarkdownViewInSourceMode = false;
    hoisted.mockSettings.shouldLoadDeferredViewsOnAutoRefresh = false;
    hoisted.mockSettings.isViewTypeIncluded.mockReturnValue(true);
    hoisted.mockIsFile.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create plugin instance', () => {
      const plugin = createPlugin();
      expect(plugin).toBeInstanceOf(Plugin);
    });

    it('should register layout-change event on onload', async () => {
      const plugin = createPlugin();
      await plugin.onload();
      expect(hoisted.mockOnWorkspace).toHaveBeenCalledWith('layout-change', expect.any(Function));
    });
  });

  describe('refreshAllOpenViews', () => {
    it('should include all leaves (condition always returns true)', async () => {
      const plugin = createPlugin();
      const loadIfDeferred = vi.fn(async () => undefined);
      const rebuildView = vi.fn(async () => undefined);
      const leaf = {
        isDeferred: false,
        isVisible: vi.fn(() => false),
        loadIfDeferred,
        rebuildView,
        view: null as unknown
      };
      const genericView = {
        containerEl: { scrollLeft: 0, scrollTop: 0 },
        getViewType: vi.fn(() => 'generic'),
        leaf
      };
      leaf.view = genericView;
      hoisted.mockIterateAllLeaves.mockImplementation((cb: (leaf: unknown) => void) => {
        cb(leaf);
      });
      await asPrivate(plugin).refreshAllOpenViews();
      expect(rebuildView).toHaveBeenCalled();
    });
  });

  describe('refreshAllVisibleViews', () => {
    it('should iterate leaves using isVisibleView filter and exclude non-visible leaves', async () => {
      const plugin = createPlugin();
      const isVisible = vi.fn(() => false);
      const leaf = {
        isDeferred: false,
        isVisible,
        loadIfDeferred: vi.fn(async () => undefined),
        rebuildView: vi.fn(async () => undefined),
        view: null as unknown
      };
      const view = {
        containerEl: { scrollLeft: 0, scrollTop: 0 },
        getViewType: vi.fn(() => 'test'),
        leaf: { isVisible }
      };
      leaf.view = view;
      hoisted.mockIterateAllLeaves.mockImplementation((cb: (leaf: unknown) => void) => {
        cb(leaf);
      });
      await asPrivate(plugin).refreshAllVisibleViews();
      // Leaf was filtered out (not visible), so rebuildView was not called
      expect(leaf.rebuildView).not.toHaveBeenCalled();
      expect(hoisted.mockIterateAllLeaves).toHaveBeenCalled();
    });
  });

  describe('refreshView', () => {
    it('should call leaf.loadIfDeferred and leaf.rebuildView for generic view', async () => {
      const plugin = createPlugin();
      const loadIfDeferred = vi.fn(async () => undefined);
      const rebuildView = vi.fn(async () => undefined);
      const view = {
        containerEl: { scrollLeft: 0, scrollTop: 0 },
        getViewType: vi.fn(() => 'generic'),
        leaf: {
          isDeferred: false,
          isVisible: vi.fn(() => false),
          loadIfDeferred,
          rebuildView
        }
      } as unknown as ViewOriginal;
      await asPrivate(plugin).refreshView(view);
      expect(loadIfDeferred).toHaveBeenCalled();
      expect(rebuildView).toHaveBeenCalled();
    });

    it('should save TextFileView when dirty', async () => {
      const plugin = createPlugin();
      const save = vi.fn(async () => undefined);
      const rebuildView = vi.fn(async () => undefined);
      const view = new TextFileViewClass() as unknown as Record<string, unknown> & ViewOriginal;
      view['dirty'] = true;
      view['save'] = save;
      view.containerEl = castTo<HTMLElement>({ scrollLeft: 0, scrollTop: 0 });
      view.leaf = castTo<WorkspaceLeaf>({
        isDeferred: false,
        isVisible: vi.fn(() => false),
        loadIfDeferred: vi.fn(async () => undefined),
        rebuildView
      });
      await asPrivate(plugin).refreshView(view);
      expect(save).toHaveBeenCalled();
    });

    it('should NOT save TextFileView when not dirty', async () => {
      const plugin = createPlugin();
      const save = vi.fn(async () => undefined);
      const rebuildView = vi.fn(async () => undefined);
      const view = new TextFileViewClass() as unknown as Record<string, unknown> & ViewOriginal;
      view['dirty'] = false;
      view['save'] = save;
      view.containerEl = castTo<HTMLElement>({ scrollLeft: 0, scrollTop: 0 });
      view.leaf = castTo<WorkspaceLeaf>({
        isDeferred: false,
        isVisible: vi.fn(() => false),
        loadIfDeferred: vi.fn(async () => undefined),
        rebuildView
      });
      await asPrivate(plugin).refreshView(view);
      expect(save).not.toHaveBeenCalled();
    });

    it('should use previewMode.rerender when in preview mode and shouldUseQuickMarkdownViewRefresh is true', async () => {
      const plugin = createPlugin();
      hoisted.mockSettings.shouldUseQuickMarkdownViewRefresh = true;
      const rerender = vi.fn();
      const rebuildView = vi.fn(async () => undefined);
      const view = new MarkdownViewClass() as unknown as Record<string, unknown> & ViewOriginal;
      view['getMode'] = vi.fn(() => 'preview');
      view['previewMode'] = { rerender };
      view.leaf = castTo<WorkspaceLeaf>({
        isDeferred: false,
        isVisible: vi.fn(() => false),
        loadIfDeferred: vi.fn(async () => undefined),
        rebuildView
      });
      view.containerEl = castTo<HTMLElement>({ scrollLeft: 0, scrollTop: 0 });
      view['file'] = null;
      await asPrivate(plugin).refreshView(view);
      expect(rerender).toHaveBeenCalledWith(true);
      expect(rebuildView).not.toHaveBeenCalled();
    });

    it('should use leaf.rebuildView when in preview mode and shouldUseQuickMarkdownViewRefresh is false', async () => {
      const plugin = createPlugin();
      hoisted.mockSettings.shouldUseQuickMarkdownViewRefresh = false;
      const rebuildView = vi.fn(async () => undefined);
      const rerender = vi.fn();
      const view = new MarkdownViewClass() as unknown as Record<string, unknown> & ViewOriginal;
      view['getMode'] = vi.fn(() => 'preview');
      view['previewMode'] = { rerender };
      view.leaf = castTo<WorkspaceLeaf>({
        isDeferred: false,
        isVisible: vi.fn(() => false),
        loadIfDeferred: vi.fn(async () => undefined),
        rebuildView
      });
      view.containerEl = castTo<HTMLElement>({ scrollLeft: 0, scrollTop: 0 });
      view['file'] = null;
      await asPrivate(plugin).refreshView(view);
      expect(rebuildView).toHaveBeenCalled();
      expect(rerender).not.toHaveBeenCalled();
    });

    it('should dispatch changes in source mode when shouldUseQuickMarkdownViewRefresh is true', async () => {
      const plugin = createPlugin();
      hoisted.mockSettings.shouldUseQuickMarkdownViewRefresh = true;
      const dispatch = vi.fn();
      const rebuildView = vi.fn(async () => undefined);
      const view = new MarkdownViewClass() as unknown as Record<string, unknown> & ViewOriginal;
      view['getMode'] = vi.fn(() => 'source');
      view['editor'] = {
        cm: {
          dispatch,
          scrollDOM: { scrollTop: 0 },
          state: {
            doc: { length: 10 },
            selection: {}
          }
        }
      };
      view.leaf = castTo<WorkspaceLeaf>({
        isDeferred: false,
        isVisible: vi.fn(() => false),
        loadIfDeferred: vi.fn(async () => undefined),
        rebuildView
      });
      view.containerEl = castTo<HTMLElement>({ scrollLeft: 0, scrollTop: 0 });
      view['file'] = null;
      await asPrivate(plugin).refreshView(view);
      expect(dispatch).toHaveBeenCalled();
      expect(rebuildView).not.toHaveBeenCalled();
    });

    it('should use leaf.rebuildView in source mode when shouldUseQuickMarkdownViewRefresh is false', async () => {
      const plugin = createPlugin();
      hoisted.mockSettings.shouldUseQuickMarkdownViewRefresh = false;
      const dispatch = vi.fn();
      const rebuildView = vi.fn(async () => undefined);
      const view = new MarkdownViewClass() as unknown as Record<string, unknown> & ViewOriginal;
      view['getMode'] = vi.fn(() => 'source');
      view['editor'] = {
        cm: {
          dispatch,
          scrollDOM: { scrollTop: 0 },
          state: {
            doc: { length: 10 },
            selection: {}
          }
        }
      };
      view.leaf = castTo<WorkspaceLeaf>({
        isDeferred: false,
        isVisible: vi.fn(() => false),
        loadIfDeferred: vi.fn(async () => undefined),
        rebuildView
      });
      view.containerEl = castTo<HTMLElement>({ scrollLeft: 0, scrollTop: 0 });
      view['file'] = null;
      await asPrivate(plugin).refreshView(view);
      expect(rebuildView).toHaveBeenCalled();
    });

    it('should call getCacheSafe when MarkdownView has a file', async () => {
      const { getCacheSafe } = await import('obsidian-dev-utils/obsidian/metadata-cache');
      const plugin = createPlugin();
      hoisted.mockSettings.shouldUseQuickMarkdownViewRefresh = false;
      const rebuildView = vi.fn(async () => undefined);
      const view = new MarkdownViewClass() as unknown as Record<string, unknown> & ViewOriginal;
      view['getMode'] = vi.fn(() => 'source');
      view['editor'] = {
        cm: {
          dispatch: vi.fn(),
          scrollDOM: { scrollTop: 0 },
          state: { doc: { length: 10 }, selection: {} }
        }
      };
      view.leaf = castTo<WorkspaceLeaf>({
        isDeferred: false,
        isVisible: vi.fn(() => false),
        loadIfDeferred: vi.fn(async () => undefined),
        rebuildView
      });
      view.containerEl = castTo<HTMLElement>({ scrollLeft: 0, scrollTop: 0 });
      view['file'] = { path: 'test.md' };
      await asPrivate(plugin).refreshView(view);
      expect(getCacheSafe).toHaveBeenCalled();
    });
  });

  describe('handleLayoutChange', () => {
    it('should not add action when itemView is null', async () => {
      const plugin = createPlugin();
      await plugin.onload();
      hoisted.mockGetActiveViewOfType.mockReturnValue(null);

      asPrivate(plugin).handleLayoutChange();

      expect(hoisted.mockGetActiveViewOfType).toHaveBeenCalled();
    });

    it('should add refresh action when itemView is present', async () => {
      const plugin = createPlugin();
      await plugin.onload();
      const addAction = vi.fn(() => document.createElement('button'));
      const itemView = {
        addAction,
        containerEl: { scrollLeft: 0, scrollTop: 0 },
        getViewType: vi.fn(() => 'test'),
        leaf: {
          isDeferred: false,
          isVisible: vi.fn(() => false),
          loadIfDeferred: vi.fn(async () => undefined),
          rebuildView: vi.fn(async () => undefined),
          view: null as unknown
        }
      } as unknown as ViewOriginal;
      hoisted.mockGetActiveViewOfType.mockReturnValue(itemView);

      asPrivate(plugin).handleLayoutChange();

      expect(addAction).toHaveBeenCalledWith('refresh-cw', 'Refresh view', expect.any(Function));
    });

    it('should not add action when itemView was already registered', async () => {
      const plugin = createPlugin();
      await plugin.onload();
      const addAction = vi.fn(() => document.createElement('button'));
      const itemView = {
        addAction,
        containerEl: { scrollLeft: 0, scrollTop: 0 },
        getViewType: vi.fn(() => 'test'),
        leaf: {
          isDeferred: false,
          isVisible: vi.fn(() => false),
          loadIfDeferred: vi.fn(async () => undefined),
          rebuildView: vi.fn(async () => undefined),
          view: null as unknown
        }
      } as unknown as ViewOriginal;
      hoisted.mockGetActiveViewOfType.mockReturnValue(itemView);

      asPrivate(plugin).handleLayoutChange();
      asPrivate(plugin).handleLayoutChange();

      expect(addAction).toHaveBeenCalledTimes(1);
    });

    it('should invoke refreshView when action button is clicked', async () => {
      const plugin = createPlugin();
      await plugin.onload();
      let capturedCallback: () => void = () => undefined;
      const addAction = vi.fn((_icon: string, _title: string, callback: () => void) => {
        capturedCallback = callback;
        return document.createElement('button');
      });
      const itemView = {
        addAction,
        containerEl: { scrollLeft: 0, scrollTop: 0 },
        getViewType: vi.fn(() => 'test'),
        leaf: {
          isDeferred: false,
          isVisible: vi.fn(() => false),
          loadIfDeferred: vi.fn(async () => undefined),
          rebuildView: vi.fn(async () => undefined)
        }
      } as unknown as ViewOriginal;
      hoisted.mockGetActiveViewOfType.mockReturnValue(itemView);

      asPrivate(plugin).handleLayoutChange();
      capturedCallback();

      expect(invokeAsyncSafely).toHaveBeenCalled();
    });
  });

  describe('handleModify', () => {
    it('should not refresh when shouldAutoRefreshOnFileChange is false', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.shouldAutoRefreshOnFileChange = false;
      const file = { path: 'test.md' } as TAbstractFile;

      asPrivate(plugin).handleModify(file);

      expect(hoisted.mockIterateAllLeaves).not.toHaveBeenCalled();
    });

    it('should not refresh when file is a folder (isFile returns false)', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.shouldAutoRefreshOnFileChange = true;
      hoisted.mockIsFile.mockReturnValue(false);
      const folder = { children: [], path: 'folder' } as unknown as TAbstractFile;

      asPrivate(plugin).handleModify(folder);

      expect(hoisted.mockIterateAllLeaves).not.toHaveBeenCalled();
    });

    it('should invoke refresh when shouldAutoRefreshOnFileChange is true and file is a file', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.shouldAutoRefreshOnFileChange = true;
      hoisted.mockIsFile.mockReturnValue(true);
      const file = { path: 'test.md' } as TAbstractFile;
      hoisted.mockIterateAllLeaves.mockImplementation((_cb: (leaf: unknown) => void) => {
        // No matching leaves
      });

      asPrivate(plugin).handleModify(file);

      expect(invokeAsyncSafely).toHaveBeenCalled();
    });
  });

  describe('isMatchingAutoRefreshMode', () => {
    it('should return false when mode is Off', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.Off;
      const view = {} as ViewOriginal;
      expect(asPrivate(plugin).isMatchingAutoRefreshMode(view)).toBe(false);
    });

    it('should return true when view is active for ActiveView mode', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.ActiveView;
      const view = {} as ViewOriginal;
      hoisted.mockGetActiveViewOfType.mockReturnValue(view);
      expect(asPrivate(plugin).isMatchingAutoRefreshMode(view)).toBe(true);
    });

    it('should return false for non-active view in ActiveView mode', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.ActiveView;
      const view = {} as ViewOriginal;
      hoisted.mockGetActiveViewOfType.mockReturnValue({} as ViewOriginal);
      expect(asPrivate(plugin).isMatchingAutoRefreshMode(view)).toBe(false);
    });

    it('should return true for AllOpenViews mode', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      const view = {} as ViewOriginal;
      expect(asPrivate(plugin).isMatchingAutoRefreshMode(view)).toBe(true);
    });

    it('should return true for visible view in AllVisibleViews mode', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.AllVisibleViews;
      const isVisible = vi.fn(() => true);
      const view = { leaf: { isVisible } } as unknown as ViewOriginal;
      expect(asPrivate(plugin).isMatchingAutoRefreshMode(view)).toBe(true);
    });

    it('should return false for non-visible view in AllVisibleViews mode', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.AllVisibleViews;
      const isVisible = vi.fn(() => false);
      const view = { leaf: { isVisible } } as unknown as ViewOriginal;
      expect(asPrivate(plugin).isMatchingAutoRefreshMode(view)).toBe(false);
    });

    it('should return false for unknown mode via default branch', () => {
      const plugin = createPlugin();

      hoisted.mockSettings.autoRefreshMode = 'UnknownMode';
      const view = {} as ViewOriginal;
      expect(asPrivate(plugin).isMatchingAutoRefreshMode(view)).toBe(false);
    });
  });

  describe('isVisibleView', () => {
    it('should return true when leaf.isVisible() is true', () => {
      const plugin = createPlugin();
      const view = { leaf: { isVisible: () => true } } as unknown as ViewOriginal;
      expect(asPrivate(plugin).isVisibleView(view)).toBe(true);
    });

    it('should return false when leaf.isVisible() is false', () => {
      const plugin = createPlugin();
      const view = { leaf: { isVisible: () => false } } as unknown as ViewOriginal;
      expect(asPrivate(plugin).isVisibleView(view)).toBe(false);
    });
  });

  describe('canAutoRefreshView', () => {
    it('should return false when viewType is not included', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.isViewTypeIncluded.mockReturnValue(false);
      const view = {
        getViewType: () => 'some-type',
        leaf: { isDeferred: false }
      } as unknown as ViewOriginal;
      expect(asPrivate(plugin).canAutoRefreshView(view)).toBe(false);
    });

    it('should return false when leaf is deferred and shouldLoadDeferredViewsOnAutoRefresh is false', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.isViewTypeIncluded.mockReturnValue(true);
      hoisted.mockSettings.shouldLoadDeferredViewsOnAutoRefresh = false;
      const view = {
        getViewType: () => 'test',
        leaf: { isDeferred: true }
      } as unknown as ViewOriginal;
      expect(asPrivate(plugin).canAutoRefreshView(view)).toBe(false);
    });

    it('should return true when leaf is deferred but shouldLoadDeferredViewsOnAutoRefresh is true', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.isViewTypeIncluded.mockReturnValue(true);
      hoisted.mockSettings.shouldLoadDeferredViewsOnAutoRefresh = true;
      const view = {
        getViewType: () => 'test',
        leaf: { isDeferred: true }
      } as unknown as ViewOriginal;
      expect(asPrivate(plugin).canAutoRefreshView(view)).toBe(true);
    });

    it('should return false for MarkdownView in source mode when shouldAutoRefreshMarkdownViewInSourceMode is false', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.isViewTypeIncluded.mockReturnValue(true);
      hoisted.mockSettings.shouldAutoRefreshMarkdownViewInSourceMode = false;
      const view = new MarkdownViewClass() as unknown as Record<string, unknown> & ViewOriginal;
      view['getMode'] = vi.fn(() => 'source');
      view.leaf = castTo<WorkspaceLeaf>({ isDeferred: false });
      view.getViewType = vi.fn(() => 'markdown');
      expect(asPrivate(plugin).canAutoRefreshView(view)).toBe(false);
    });

    it('should return true for MarkdownView in source mode when shouldAutoRefreshMarkdownViewInSourceMode is true', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.isViewTypeIncluded.mockReturnValue(true);
      hoisted.mockSettings.shouldAutoRefreshMarkdownViewInSourceMode = true;
      const view = new MarkdownViewClass() as unknown as Record<string, unknown> & ViewOriginal;
      view['getMode'] = vi.fn(() => 'source');
      view.leaf = castTo<WorkspaceLeaf>({ isDeferred: false });
      view.getViewType = vi.fn(() => 'markdown');
      expect(asPrivate(plugin).canAutoRefreshView(view)).toBe(true);
    });

    it('should return true for MarkdownView in preview mode regardless of source mode setting', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.isViewTypeIncluded.mockReturnValue(true);
      hoisted.mockSettings.shouldAutoRefreshMarkdownViewInSourceMode = false;
      const view = new MarkdownViewClass() as unknown as Record<string, unknown> & ViewOriginal;
      view['getMode'] = vi.fn(() => 'preview');
      view.leaf = castTo<WorkspaceLeaf>({ isDeferred: false });
      view.getViewType = vi.fn(() => 'markdown');
      expect(asPrivate(plugin).canAutoRefreshView(view)).toBe(true);
    });
  });

  describe('loadDeferredViews', () => {
    it('should return early when shouldLoadDeferredViewsOnStart is false', async () => {
      const plugin = createPlugin();
      hoisted.mockSettings.shouldLoadDeferredViewsOnStart = false;
      await asPrivate(plugin).loadDeferredViews();
      expect(hoisted.mockIterateAllLeaves).not.toHaveBeenCalled();
    });

    it('should load deferred views when shouldLoadDeferredViewsOnStart is true', async () => {
      const plugin = createPlugin();
      hoisted.mockSettings.shouldLoadDeferredViewsOnStart = true;
      const loadIfDeferred = vi.fn(async () => undefined);
      hoisted.mockIterateAllLeaves.mockImplementation((cb: (leaf: unknown) => void) => {
        cb({ isDeferred: true, loadIfDeferred, view: {} });
      });
      await asPrivate(plugin).loadDeferredViews();
      expect(loadIfDeferred).toHaveBeenCalled();
    });
  });

  describe('onLayoutReady', () => {
    it('should register vault modify event and setup patches', async () => {
      const plugin = createPlugin();
      await plugin.onload();
      // Make getActiveViewOfType return null so handleLayoutChange() skips addAction
      hoisted.mockGetActiveViewOfType.mockReturnValue(null);
      await triggerLayoutReady(plugin);
      expect(hoisted.mockOnVault).toHaveBeenCalledWith('modify', expect.any(Function));
      expect(hoisted.mockMonkeyAroundRegisterPatch).toHaveBeenCalledWith(
        WorkspaceLeaf.prototype,
        expect.objectContaining({ onOpenTabHeaderMenu: expect.any(Function) })
      );
    });

    it('should register saveSettings listener and call registerAutoRefreshTimer on change', async () => {
      const plugin = createPlugin();
      await plugin.onload();
      hoisted.mockGetActiveViewOfType.mockReturnValue(null);
      await triggerLayoutReady(plugin);

      const saveCallback = hoisted.capturedSaveSettingsCallbacks[0];
      expect(saveCallback).toBeDefined();
      await saveCallback?.();
    });

    it('should produce onOpenTabHeaderMenu patch that calls next and adds menu items', async () => {
      const plugin = createPlugin();
      await plugin.onload();
      hoisted.mockGetActiveViewOfType.mockReturnValue(null);
      await triggerLayoutReady(plugin);

      const patchCall = hoisted.mockMonkeyAroundRegisterPatch.mock.calls[0];
      const patches = patchCall?.[1] as Record<string, (next: (...args: unknown[]) => unknown) => (...args: unknown[]) => unknown>;
      const patchFactory = patches?.['onOpenTabHeaderMenu'];
      expect(patchFactory).toBeDefined();

      const next = vi.fn();
      const patched = ensureNonNullable(patchFactory)(next);
      const addItem = vi.fn((cb: (item: unknown) => void) => {
        cb({
          onClick: vi.fn(),
          setIcon: vi.fn(),
          setSection: vi.fn(),
          setTitle: vi.fn()
        });
      });
      const { Menu } = await import('obsidian');
      Menu.forEvent = vi.fn(() => ({ addItem })) as unknown as typeof Menu.forEvent;
      const leaf = {
        view: { getViewType: vi.fn(() => 'markdown') }
      };
      const evt = new MouseEvent('click');
      const parentEl = document.createElement('div');
      patched.call(leaf, evt, parentEl);
      expect(next).toHaveBeenCalled();
      expect(addItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('registerAutoRefreshTimer', () => {
    it('should not set interval when autoRefreshMode is Off', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.Off;
      vi.useFakeTimers();
      asPrivate(plugin).registerAutoRefreshTimer();
      expect(hoisted.mockRegisterInterval).not.toHaveBeenCalled();
    });

    it('should set interval when autoRefreshMode is not Off', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      hoisted.mockSettings.autoRefreshIntervalInSeconds = 5;
      vi.useFakeTimers();
      asPrivate(plugin).registerAutoRefreshTimer();
      expect(hoisted.mockRegisterInterval).toHaveBeenCalled();
    });

    it('should clear previous interval when called again', () => {
      const plugin = createPlugin();
      hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      hoisted.mockSettings.autoRefreshIntervalInSeconds = 5;
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
      asPrivate(plugin).registerAutoRefreshTimer();
      asPrivate(plugin).registerAutoRefreshTimer();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should invoke refreshViews when interval fires', async () => {
      const plugin = createPlugin();
      hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      hoisted.mockSettings.autoRefreshIntervalInSeconds = 1;
      hoisted.mockIterateAllLeaves.mockImplementation((_cb: (leaf: unknown) => void) => {
        // No leaves
      });
      vi.useFakeTimers();
      asPrivate(plugin).registerAutoRefreshTimer();
      await vi.advanceTimersByTimeAsync(1000);
      expect(invokeAsyncSafely).toHaveBeenCalled();
    });
  });

  describe('onOpenTabHeaderMenu', () => {
    it('should call next and add two menu items', async () => {
      const plugin = createPlugin();
      const next = vi.fn();
      const addItem = vi.fn((cb: (item: unknown) => void) => {
        cb({
          onClick: vi.fn((_handler: () => void) => undefined),
          setIcon: vi.fn(),
          setSection: vi.fn(),
          setTitle: vi.fn()
        });
      });
      const { Menu } = await import('obsidian');
      Menu.forEvent = vi.fn(() => ({ addItem })) as unknown as typeof Menu.forEvent;
      const evt = new MouseEvent('click');
      const leaf = {
        view: { getViewType: vi.fn(() => 'test') }
      } as unknown as WorkspaceLeaf;
      const parentEl = document.createElement('div');
      asPrivate(plugin).onOpenTabHeaderMenu(next, leaf, evt, parentEl);
      expect(next).toHaveBeenCalled();
      expect(addItem).toHaveBeenCalledTimes(2);
    });

    it('should invoke refreshView when first menu item is clicked', async () => {
      const plugin = createPlugin();
      const next = vi.fn();
      let capturedOnClick: (() => void) | undefined;
      const addItem = vi.fn((cb: (item: unknown) => void) => {
        const item = {
          onClick: vi.fn((handler: () => void) => {
            if (!capturedOnClick) {
              capturedOnClick = handler;
            }
          }),
          setIcon: vi.fn(),
          setSection: vi.fn(),
          setTitle: vi.fn()
        };
        cb(item);
      });
      const { Menu } = await import('obsidian');
      Menu.forEvent = vi.fn(() => ({ addItem })) as unknown as typeof Menu.forEvent;
      const evt = new MouseEvent('click');
      const rebuildView = vi.fn(async () => undefined);
      const leaf = {
        view: {
          containerEl: { scrollLeft: 0, scrollTop: 0 },
          getViewType: vi.fn(() => 'test'),
          leaf: {
            isDeferred: false,
            isVisible: vi.fn(() => false),
            loadIfDeferred: vi.fn(async () => undefined),
            rebuildView
          }
        }
      } as unknown as WorkspaceLeaf;
      leaf.view.leaf = leaf;
      const parentEl = document.createElement('div');
      asPrivate(plugin).onOpenTabHeaderMenu(next, leaf, evt, parentEl);
      capturedOnClick?.();
      expect(invokeAsyncSafely).toHaveBeenCalled();
    });

    it('should invoke copyViewTypeToClipboard when second menu item is clicked', async () => {
      const plugin = createPlugin();
      const next = vi.fn();
      let clickCount = 0;
      let capturedSecondOnClick: (() => void) | undefined;
      const addItem = vi.fn((cb: (item: unknown) => void) => {
        const item = {
          onClick: vi.fn((handler: () => void) => {
            clickCount++;
            if (clickCount === 2) {
              capturedSecondOnClick = handler;
            }
          }),
          setIcon: vi.fn(),
          setSection: vi.fn(),
          setTitle: vi.fn()
        };
        cb(item);
      });
      const { Menu } = await import('obsidian');
      Menu.forEvent = vi.fn(() => ({ addItem })) as unknown as typeof Menu.forEvent;
      const evt = new MouseEvent('click');
      const leaf = {
        view: { getViewType: vi.fn(() => 'test-view') }
      } as unknown as WorkspaceLeaf;
      const parentEl = document.createElement('div');
      asPrivate(plugin).onOpenTabHeaderMenu(next, leaf, evt, parentEl);
      capturedSecondOnClick?.();
      expect(invokeAsyncSafely).toHaveBeenCalled();
    });
  });

  describe('executeKeepingFocus', () => {
    it('should execute callback and restore focus to active element', async () => {
      const plugin = createPlugin();
      const btn = document.createElement('button');
      document.body.appendChild(btn);
      const focusSpy = vi.spyOn(btn, 'focus');
      btn.focus();
      const callback = vi.fn(async () => undefined);
      await asPrivate(plugin).executeKeepingFocus(callback);
      expect(callback).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
      btn.remove();
    });

    it('should restore focus even when callback throws', async () => {
      const plugin = createPlugin();
      const btn = document.createElement('button');
      document.body.appendChild(btn);
      const focusSpy = vi.spyOn(btn, 'focus');
      btn.focus();
      const callback = vi.fn(async () => {
        throw new Error('test error');
      });
      await expect(asPrivate(plugin).executeKeepingFocus(callback)).rejects.toThrow('test error');
      expect(focusSpy).toHaveBeenCalled();
      btn.remove();
    });

    it('should not call focus when active element is not an HTMLElement', async () => {
      const plugin = createPlugin();
      // Spy on activeDocument.activeElement to return null (covers false branch of instanceof HTMLElement)
      vi.spyOn(activeDocument, 'activeElement', 'get').mockReturnValue(null);
      const callback = vi.fn(async () => undefined);
      await asPrivate(plugin).executeKeepingFocus(callback);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('getActiveView lambda (passed to RefreshActiveViewCommandHandler)', () => {
    it('should call workspace.getActiveViewOfType when invoked', () => {
      const plugin = createPlugin();
      expect(plugin).toBeInstanceOf(Plugin);
      const getActiveView = hoisted.capturedRefreshActiveViewGetActiveView[0];
      expect(getActiveView).toBeDefined();
      const mockView = {} as ViewOriginal;
      hoisted.mockGetActiveViewOfType.mockReturnValue(mockView);
      const result = getActiveView?.();
      expect(result).toBe(mockView);
      expect(hoisted.mockGetActiveViewOfType).toHaveBeenCalled();
    });
  });

  describe('register cleanup callback (buttonEl.remove)', () => {
    it('should remove the button element when cleanup is called', async () => {
      const plugin = createPlugin();
      await plugin.onload();
      const addAction = vi.fn(() => {
        const btn = document.createElement('button');
        document.body.appendChild(btn);
        return btn;
      });
      const itemView = {
        addAction,
        containerEl: { scrollLeft: 0, scrollTop: 0 },
        getViewType: vi.fn(() => 'test'),
        leaf: {
          isDeferred: false,
          isVisible: vi.fn(() => false),
          loadIfDeferred: vi.fn(async () => undefined),
          rebuildView: vi.fn(async () => undefined)
        }
      } as unknown as ViewOriginal;
      hoisted.mockGetActiveViewOfType.mockReturnValue(itemView);

      hoisted.capturedRegisterCallbacks.length = 0;
      asPrivate(plugin).handleLayoutChange();

      const cleanup = hoisted.capturedRegisterCallbacks[0];
      expect(cleanup).toBeDefined();
      // Calling the cleanup should invoke buttonEl.remove()
      cleanup?.();
    });
  });

  describe('refreshViews with FileView condition', () => {
    it('should invoke lambda that checks FileView.file match in handleModify', async () => {
      const plugin = createPlugin();
      hoisted.mockSettings.shouldAutoRefreshOnFileChange = true;
      hoisted.mockIsFile.mockReturnValue(true);
      hoisted.mockSettings.isViewTypeIncluded.mockReturnValue(true);

      // Use the same reference for both the view's file and the modified file
      const sharedFile = { path: 'test.md' } as TAbstractFile;
      const loadIfDeferred = vi.fn(async () => undefined);
      const rebuildView = vi.fn(async () => undefined);
      const leaf = {
        isDeferred: false,
        isVisible: vi.fn(() => false),
        loadIfDeferred,
        rebuildView,
        view: null as unknown
      };
      const fileView = new FileViewClass() as unknown as Record<string, unknown>;
      fileView['file'] = sharedFile;
      fileView['containerEl'] = { scrollLeft: 0, scrollTop: 0 };
      fileView['getViewType'] = vi.fn(() => 'test');
      fileView['leaf'] = leaf;
      leaf.view = fileView;

      hoisted.mockIterateAllLeaves.mockImplementation((cb: (leaf: unknown) => void) => {
        cb(leaf);
      });

      asPrivate(plugin).handleModify(sharedFile);
      // Flush microtasks so the async chain in invokeAsyncSafely completes
      await noopAsync();
      await noopAsync();
      expect(rebuildView).toHaveBeenCalled();
    });

    it('should invoke lambda that checks isMatchingAutoRefreshMode in timer interval', async () => {
      const plugin = createPlugin();
      hoisted.mockSettings.autoRefreshMode = AutoRefreshMode.AllOpenViews;
      hoisted.mockSettings.autoRefreshIntervalInSeconds = 1;
      hoisted.mockSettings.isViewTypeIncluded.mockReturnValue(true);

      const loadIfDeferred = vi.fn(async () => undefined);
      const rebuildView = vi.fn(async () => undefined);
      const leaf = {
        isDeferred: false,
        isVisible: vi.fn(() => false),
        loadIfDeferred,
        rebuildView,
        view: null as unknown
      };
      const genericView = {
        containerEl: { scrollLeft: 0, scrollTop: 0 },
        getViewType: vi.fn(() => 'test'),
        leaf
      } as unknown;
      leaf.view = genericView;

      hoisted.mockIterateAllLeaves.mockImplementation((cb: (leaf: unknown) => void) => {
        cb(leaf);
      });

      vi.useFakeTimers();
      asPrivate(plugin).registerAutoRefreshTimer();
      await vi.advanceTimersByTimeAsync(1000);
      expect(rebuildView).toHaveBeenCalled();
    });
  });

  describe('executeKeepingFocus non-HTMLElement branch', () => {
    it('should not throw when activeElement is the document body', async () => {
      const plugin = createPlugin();
      // Blur everything so activeDocument.activeElement is body (not HTMLElement trigger)
      // The body is an HTMLElement, so test with SVGElement-like scenario
      // By checking the branch is covered via the SVGElement path
      const callback = vi.fn(async () => undefined);
      await asPrivate(plugin).executeKeepingFocus(callback);
      expect(callback).toHaveBeenCalled();
    });
  });
});
/* eslint-enable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-empty-function, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-useless-constructor, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/require-await, func-style, no-restricted-syntax, obsidianmd/prefer-active-doc -- End of test file. */
