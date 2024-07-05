# Refresh Preview

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

Also the plugin adds the `Refresh Preview: Refresh Preview` command to the command palette.

## Installation

- `Refresh Preview` is not available on [the official Community Plugins repository](https://obsidian.md/plugins) yet.
- Beta releases can be installed through [BRAT](https://github.com/TfTHacker/obsidian42-brat).

## License

 © [Michael Naumov](https://github.com/mnaoumov/)
