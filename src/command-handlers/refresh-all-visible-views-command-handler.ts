import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

interface RefreshAllVisibleViewsCommandHandlerConstructorParams {
  refreshAllVisibleViews(this: void): Promise<void>;
}

export class RefreshAllVisibleViewsCommandHandler extends GlobalCommandHandler {
  private readonly refreshAllVisibleViews: () => Promise<void>;

  public constructor(params: RefreshAllVisibleViewsCommandHandlerConstructorParams) {
    super({
      icon: 'refresh-ccw',
      id: 'refresh-all-visible-views',
      name: 'Refresh all visible views'
    });
    this.refreshAllVisibleViews = params.refreshAllVisibleViews;
  }

  protected override async execute(): Promise<void> {
    await this.refreshAllVisibleViews();
  }
}
