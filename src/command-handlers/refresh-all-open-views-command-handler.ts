import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

interface RefreshAllOpenViewsCommandHandlerConstructorParams {
  refreshAllOpenViews(this: void): Promise<void>;
}

export class RefreshAllOpenViewsCommandHandler extends GlobalCommandHandler {
  private readonly refreshAllOpenViews: () => Promise<void>;

  public constructor(params: RefreshAllOpenViewsCommandHandlerConstructorParams) {
    super({
      icon: 'refresh-ccw',
      id: 'refresh-all-open-views',
      name: 'Refresh all open views'
    });
    this.refreshAllOpenViews = params.refreshAllOpenViews;
  }

  protected override async execute(): Promise<void> {
    await this.refreshAllOpenViews();
  }
}
