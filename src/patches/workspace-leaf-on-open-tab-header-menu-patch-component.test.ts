import type {
  View as ViewOriginal,
  WorkspaceLeaf as WorkspaceLeafOriginal
} from 'obsidian';

import { waitForAllAsyncOperations } from 'obsidian-dev-utils/async';
import { noopAsync } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  App,
  Menu,
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

import type { RefreshAnyViewComponent } from '../refresh-any-view-component.ts';

import { WorkspaceLeafOnOpenTabHeaderMenuPatchComponent } from './workspace-leaf-on-open-tab-header-menu-patch-component.ts';

interface MenuItemTestable {
  onClick__?(evt: unknown): void;
}

interface MenuTestable {
  items__: MenuItemTestable[];
}

interface RefreshAnyViewComponentStubSpec {
  refreshView?(view: ViewOriginal): Promise<void>;
}

let appMock: App;
let loadedComponent: undefined | WorkspaceLeafOnOpenTabHeaderMenuPatchComponent;

describe('WorkspaceLeafOnOpenTabHeaderMenuPatchComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appMock = App.createConfigured__();
  });

  afterEach(() => {
    // Unload the component so the real monkey-around patch on `WorkspaceLeaf.prototype` is removed,
    // Preventing cross-test prototype-patch leakage.
    loadedComponent?.unload();
    loadedComponent = undefined;
    vi.restoreAllMocks();
  });

  it('should chain to the original method and add two menu items', () => {
    const baseSpy = vi.spyOn(castTo<WorkspaceLeafOriginal>(WorkspaceLeaf.prototype), 'onOpenTabHeaderMenu');
    loadPatchComponent({});
    const forEventSpy = vi.spyOn(Menu, 'forEvent');

    openTabHeaderMenu({ getViewType: () => 'markdown' });

    expect(baseSpy).toHaveBeenCalled();
    const menu = castTo<MenuTestable>(forEventSpy.mock.results[0]?.value);
    expect(menu.items__).toHaveLength(2);
  });

  it('should refresh the leaf view when the first menu item is clicked', async () => {
    const refreshView = vi.fn((_view: ViewOriginal): Promise<void> => noopAsync());
    loadPatchComponent({ refreshView });
    const forEventSpy = vi.spyOn(Menu, 'forEvent');

    const view = castTo<ViewOriginal>({ getViewType: () => 'markdown' });
    const leaf = openTabHeaderMenu(view);

    const menu = castTo<MenuTestable>(forEventSpy.mock.results[0]?.value);
    menu.items__[0]?.onClick__?.(new MouseEvent('click'));
    await waitForAllAsyncOperations();
    expect(refreshView).toHaveBeenCalledWith(castTo<WorkspaceLeafOriginal>(leaf).view);
  });

  it('should copy the view type to the clipboard when the second menu item is clicked', async () => {
    loadPatchComponent({});
    const forEventSpy = vi.spyOn(Menu, 'forEvent');
    const writeText = vi.fn((_text: string): Promise<void> => noopAsync());
    Object.defineProperty(activeWindow.navigator, 'clipboard', {
      configurable: true,
      value: castTo<Clipboard>({ writeText })
    });

    openTabHeaderMenu({ getViewType: () => 'some-view-type' });

    const menu = castTo<MenuTestable>(forEventSpy.mock.results[0]?.value);
    menu.items__[1]?.onClick__?.(new MouseEvent('click'));
    await waitForAllAsyncOperations();
    expect(writeText).toHaveBeenCalledWith('some-view-type');
  });
});

function loadPatchComponent(spec: RefreshAnyViewComponentStubSpec): WorkspaceLeafOnOpenTabHeaderMenuPatchComponent {
  const refreshAnyViewComponent = strictProxy<RefreshAnyViewComponent>({
    refreshView: spec.refreshView ?? ((): Promise<void> => noopAsync())
  });
  const component = new WorkspaceLeafOnOpenTabHeaderMenuPatchComponent(refreshAnyViewComponent);
  component.load();
  loadedComponent = component;
  return component;
}

function openTabHeaderMenu(view: Partial<ViewOriginal>): WorkspaceLeaf {
  const leaf = WorkspaceLeaf.create2__(appMock);
  leaf.view = castTo<typeof leaf.view>(view);
  const evt = new MouseEvent('click');
  const parentEl = activeDocument.createElement('div');
  castTo<WorkspaceLeafOriginal>(leaf).onOpenTabHeaderMenu(evt, parentEl);
  return leaf;
}
