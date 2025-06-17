# Refresh Any View

(formerly known as `Refresh Preview`, see [Rebranding](#rebranding) section for more details)

This is a plugin for [Obsidian](https://obsidian.md/) that allows to refresh preview mode without reopening the note.

It is usually useful if you have some dynamic content:

````markdown
```dataviewjs
dv.span(new Date().toString());
```
````

When you switch to the preview mode, the content is rendered once and will rerender only if you change the content of the code block or reopen the note.

The plugin adds a `Refresh Preview` button:

![Demo](images/demo.gif)

Also the plugin adds the `Refresh Preview: Refresh` command to the command palette.

The plugin allows to configure auto refresh on file change.

The plugin allows to configure auto refresh within a given time interval.

## Installation

The plugin is available in [the official Community Plugins repository](https://obsidian.md/plugins?id=refresh-preview).

### Beta versions

To install the latest beta release of this plugin (regardless if it is available in [the official Community Plugins repository](https://obsidian.md/plugins) or not), follow these steps:

1. Ensure you have the [BRAT plugin](https://obsidian.md/plugins?id=obsidian42-brat) installed and enabled.
2. Click [Install via BRAT](https://intradeus.github.io/http-protocol-redirector?r=obsidian://brat?plugin=https://github.com/mnaoumov/obsidian-refresh-preview).
3. An Obsidian pop-up window should appear. In the window, click the `Add plugin` button once and wait a few seconds for the plugin to install.

## Debugging

By default, debug messages for this plugin are hidden.

To show them, run the following command:

```js
window.DEBUG.enable('refresh-preview');
```

For more details, refer to the [documentation](https://github.com/mnaoumov/obsidian-dev-utils/blob/main/docs/debugging.md).

## Rebranding

This plugin was formerly known as `Refresh Preview`.

The plugin can now refresh any views, not only in preview mode. That's why it got a new name.

However, for the backward compatibility, the previous id `refresh-preview` is still used internally and you might find it

- in plugin folder name;
- in plugin URL;
- in [Debugging](#debugging) section;

## Support

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;"></a>

## License

© [Michael Naumov](https://github.com/mnaoumov/)
