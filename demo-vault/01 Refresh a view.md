# Refresh a view

Obsidian renders a view once, when it opens. If the view shows **dynamic content** - a Dataview query, an embedded note, a rendered timestamp, output from another plugin - that content is frozen at first render and only updates when you close and reopen the view. **Refresh Any View** re-renders the view **in place** instead, preserving your scroll position.

## Ways to refresh

The plugin gives you a toolbar button and three commands:

- **Refresh view** button
  - the circular-arrows icon the plugin adds to every view's toolbar (top-right of the tab). Refreshes
    just that view.
- **Refresh Any View: Refresh active view**
  - refreshes the currently focused view.
- **Refresh Any View: Refresh all visible views**
  - refreshes every view you can currently see (all panes on screen).
- **Refresh Any View: Refresh all open views**
  - refreshes every open view, including background tabs.

![The refresh button re-rendering a view in place](<./_assets/images/demo.gif>)

## Try it

1. Open this note (or any note) in **Reading** mode.
2. Click the **Refresh view** button in the top-right toolbar, or run **Refresh Any View: Refresh active view** from the Command Palette (`Ctrl`/`Cmd` + `P`).
3. The view re-renders in place - it does not close and reopen, and your scroll position is kept.

## When it is useful

The classic case is a note with content that renders once but should be re-evaluated on demand. For example, a Dataview `dataviewjs` block that prints the current time renders its value once and then never changes:

````markdown
```dataviewjs
dv.span(new Date().toString());
```
````

With that block, switching to Reading mode shows a timestamp that stays frozen. Running **Refresh active view** re-renders the block and updates the timestamp - no reopening needed. (That specific example needs the community **Dataview** plugin, which this demo vault does not bundle; the refresh commands themselves work on any view.)

Prefer it to happen automatically? See [02 Settings](<./02 Settings.md>) for auto-refresh on file change and on a timer.
