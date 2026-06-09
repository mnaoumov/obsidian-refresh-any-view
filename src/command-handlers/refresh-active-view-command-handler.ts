import type { View } from 'obsidian';

import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

interface RefreshActiveViewCommandHandlerConstructorParams {
  getActiveView(this: void): null | View;
  refreshView(this: void, view: View): Promise<void>;
}

export class RefreshActiveViewCommandHandler extends GlobalCommandHandler {
  private readonly getActiveView: () => null | View;
  private readonly refreshView: (view: View) => Promise<void>;

  public constructor(params: RefreshActiveViewCommandHandlerConstructorParams) {
    super({
      icon: 'refresh-ccw',
      id: 'refresh-active-view',
      name: 'Refresh active view'
    });
    this.getActiveView = params.getActiveView;
    this.refreshView = params.refreshView;
  }

  protected override canExecute(): boolean {
    return this.getActiveView() !== null;
  }

  protected override async execute(): Promise<void> {
    const view = this.getActiveView();
    if (view) {
      await this.refreshView(view);
    }
  }
}
