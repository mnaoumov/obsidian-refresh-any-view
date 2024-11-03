import {
  MarkdownView,
  Plugin,
  setIcon,
  setTooltip
} from 'obsidian';

export default class RefreshPreviewPlugin extends Plugin {
  public override onload(): void {
    this.app.workspace.onLayoutReady(this.onLayoutReady.bind(this));
    this.addCommand({
      id: 'refresh-preview',
      name: 'Refresh',
      checkCallback: this.refreshPreview.bind(this)
    });

    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        this.addRefreshPreviewButton();
      })
    );

    this.registerDomEvent(document, 'click', (event: MouseEvent): void => {
      if (event.target instanceof HTMLElement && event.target.matches('.refresh-preview-button')) {
        this.refreshPreview(false);
      }
    });
    this.register(this.removeRefreshPreviewButton.bind(this));
  }

  private onLayoutReady(): void {
    this.addRefreshPreviewButton();
  }

  private refreshPreview(checking: boolean): boolean {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view?.getMode() !== 'preview') {
      return false;
    }

    if (!checking) {
      view.previewMode.rerender(true);
    }
    return true;
  }

  private addRefreshPreviewButton(): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      return;
    }

    if (view.getMode() !== 'preview') {
      this.removeRefreshPreviewButtonFromView(view);
      return;
    }

    const actionsContainer = this.getActionsContainer(view);
    if (!actionsContainer) {
      return;
    }

    let refreshPreviewButton = this.getRefreshPreviewButton(actionsContainer);

    if (refreshPreviewButton) {
      return;
    }

    refreshPreviewButton = createEl('button', {
      cls: 'refresh-preview-button clickable-icon view-action'
    });
    setIcon(refreshPreviewButton, 'refresh-cw');
    setTooltip(refreshPreviewButton, 'Refresh preview');

    actionsContainer.prepend(refreshPreviewButton);
  }

  private getRefreshPreviewButton(actionsContainer: Element): HTMLButtonElement | null {
    return actionsContainer.querySelector<HTMLButtonElement>('.refresh-preview-button');
  }

  private removeRefreshPreviewButton(): void {
    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      this.removeRefreshPreviewButtonFromView(leaf.view as MarkdownView);
    }
  }

  private getActionsContainer(view: MarkdownView): Element | null {
    return view.containerEl.querySelector('.view-header .view-actions');
  }

  private removeRefreshPreviewButtonFromView(view: MarkdownView): void {
    const actionsContainer = this.getActionsContainer(view);

    if (!actionsContainer) {
      return;
    }

    const refreshPreviewButton = this.getRefreshPreviewButton(actionsContainer);

    if (refreshPreviewButton) {
      actionsContainer.removeChild(refreshPreviewButton);
    }
  }
}
