import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { RefreshAnyViewComponent } from '../refresh-any-view-component.ts';

interface RefreshAllOpenViewsCommandHandlerConstructorParams {
  readonly refreshAnyViewComponent: RefreshAnyViewComponent;
}

export class RefreshAllOpenViewsCommandHandler extends GlobalCommandHandler {
  private readonly refreshAnyViewComponent: RefreshAnyViewComponent;

  public constructor(params: RefreshAllOpenViewsCommandHandlerConstructorParams) {
    super({
      icon: 'refresh-ccw',
      id: 'refresh-all-open-views',
      name: 'Refresh all open views'
    });
    this.refreshAnyViewComponent = params.refreshAnyViewComponent;
  }

  protected override async execute(): Promise<void> {
    await this.refreshAnyViewComponent.refreshAllOpenViews();
  }
}
