import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { RefreshAnyViewComponent } from '../refresh-any-view-component.ts';

interface RefreshActiveViewCommandHandlerConstructorParams {
  readonly refreshAnyViewComponent: RefreshAnyViewComponent;
}

export class RefreshActiveViewCommandHandler extends GlobalCommandHandler {
  private readonly refreshAnyViewComponent: RefreshAnyViewComponent;

  public constructor(params: RefreshActiveViewCommandHandlerConstructorParams) {
    super({
      icon: 'refresh-ccw',
      id: 'refresh-active-view',
      name: 'Refresh active view'
    });
    this.refreshAnyViewComponent = params.refreshAnyViewComponent;
  }

  protected override canExecute(): boolean {
    return this.refreshAnyViewComponent.getActiveView() !== null;
  }

  protected override async execute(): Promise<void> {
    const view = this.refreshAnyViewComponent.getActiveView();
    if (view) {
      await this.refreshAnyViewComponent.refreshView(view);
    }
  }
}
