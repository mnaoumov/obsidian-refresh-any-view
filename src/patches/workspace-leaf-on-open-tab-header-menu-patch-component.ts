import { MonkeyAroundComponent } from '@mnaoumov/obsidian-lib/components/monkey-around-component';
import {
  convertAsyncToSync,
  invokeAsyncSafely
} from '@mnaoumov/typescript-lib/async';
import {
  Menu,
  WorkspaceLeaf
} from 'obsidian';

import type { RefreshAnyViewComponent } from '../refresh-any-view-component.ts';

export class WorkspaceLeafOnOpenTabHeaderMenuPatchComponent extends MonkeyAroundComponent {
  public constructor(private readonly refreshAnyViewComponent: RefreshAnyViewComponent) {
    super();
  }

  public override onload(): void {
    this.registerMethodPatch({
      $object: WorkspaceLeaf.prototype,
      methodName: 'onOpenTabHeaderMenu',
      patchHandler: ({
        fallback,
        originalArguments: [$event],
        originalThis
      }) => {
        const leaf = originalThis;
        fallback();
        const menu = Menu.forEvent($event);
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
