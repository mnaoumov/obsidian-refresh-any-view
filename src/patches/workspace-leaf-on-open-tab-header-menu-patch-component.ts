import {
  Menu,
  WorkspaceLeaf
} from 'obsidian';
import {
  convertAsyncToSync,
  invokeAsyncSafely
} from 'obsidian-dev-utils/async';
import { MonkeyAroundComponent } from 'obsidian-dev-utils/obsidian/components/monkey-around-component';

import type { RefreshAnyViewComponent } from '../refresh-any-view-component.ts';

export class WorkspaceLeafOnOpenTabHeaderMenuPatchComponent extends MonkeyAroundComponent {
  public constructor(private readonly refreshAnyViewComponent: RefreshAnyViewComponent) {
    super();
  }

  public override onload(): void {
    this.registerMethodPatch({
      methodName: 'onOpenTabHeaderMenu',
      obj: WorkspaceLeaf.prototype,
      patchHandler: ({
        fallback,
        originalArgs: [evt],
        originalThis
      }) => {
        const leaf = originalThis;
        fallback();
        const menu = Menu.forEvent(evt);
        menu.addItem((item) => {
          item.setTitle('Refresh view');
          item.setIcon('refresh-cw');
          item.setSection('pane');
          item.onClick(convertAsyncToSync(async () => this.refreshAnyViewComponent.refreshView(leaf.view)));
        });

        menu.addItem((item) => {
          const viewType = leaf.view.getViewType();
          item.setTitle(`Copy view type '${viewType}' to clipboard`);
          item.setIcon('info');
          item.setSection('pane');
          item.onClick(() => {
            invokeAsyncSafely(() => this.copyViewTypeToClipboard(viewType));
          });
        });
      }
    });
  }

  private async copyViewTypeToClipboard(viewType: string): Promise<void> {
    await activeWindow.navigator.clipboard.writeText(viewType);
  }
}
