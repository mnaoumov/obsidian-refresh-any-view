import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { RefreshAnyViewComponent } from '../refresh-any-view-component.ts';

interface RefreshAllVisibleViewsCommandHandlerConstructorParams {
  readonly refreshAnyViewComponent: RefreshAnyViewComponent;
}

export class RefreshAllVisibleViewsCommandHandler extends GlobalCommandHandler {
  private readonly refreshAnyViewComponent: RefreshAnyViewComponent;

  public constructor(params: RefreshAllVisibleViewsCommandHandlerConstructorParams) {
    super({
      icon: 'refresh-ccw',
      id: 'refresh-all-visible-views',
      name: 'Refresh all visible views'
    });
    this.refreshAnyViewComponent = params.refreshAnyViewComponent;
  }

  protected override async execute(): Promise<void> {
    await this.refreshAnyViewComponent.refreshAllVisibleViews();
  }
}
