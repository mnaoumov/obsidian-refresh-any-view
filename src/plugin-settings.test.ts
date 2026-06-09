import {
  describe,
  expect,
  it
} from 'vitest';

import {
  AutoRefreshMode,
  PluginSettings
} from './plugin-settings.ts';

describe('PluginSettings', () => {
  it('should have correct default values', () => {
    const settings = new PluginSettings();
    expect(settings.autoRefreshIntervalInSeconds).toBe(5);
    expect(settings.autoRefreshMode).toBe(AutoRefreshMode.Off);
    expect(settings.excludeViewTypesForAutoRefresh).toEqual([]);
    expect(settings.includeViewTypesForAutoRefresh).toEqual([]);
    expect(settings.shouldAutoRefreshMarkdownViewInSourceMode).toBe(false);
    expect(settings.shouldAutoRefreshOnFileChange).toBe(false);
    expect(settings.shouldLoadDeferredViewsOnAutoRefresh).toBe(false);
    expect(settings.shouldLoadDeferredViewsOnStart).toBe(false);
    expect(settings.shouldUseQuickMarkdownViewRefresh).toBe(true);
  });
});

describe('PluginSettings.isViewTypeIncluded', () => {
  it('should return true when include list is empty and viewType is not excluded', () => {
    const settings = new PluginSettings();
    expect(settings.isViewTypeIncluded('markdown')).toBe(true);
  });

  it('should return true when viewType is in include list and not excluded', () => {
    const settings = new PluginSettings();
    settings.includeViewTypesForAutoRefresh = ['markdown', 'canvas'];
    expect(settings.isViewTypeIncluded('markdown')).toBe(true);
  });

  it('should return false when viewType is not in include list', () => {
    const settings = new PluginSettings();
    settings.includeViewTypesForAutoRefresh = ['canvas'];
    expect(settings.isViewTypeIncluded('markdown')).toBe(false);
  });

  it('should return false when viewType is in exclude list', () => {
    const settings = new PluginSettings();
    settings.excludeViewTypesForAutoRefresh = ['file-explorer'];
    expect(settings.isViewTypeIncluded('file-explorer')).toBe(false);
  });

  it('should return false when viewType is in both include and exclude lists', () => {
    const settings = new PluginSettings();
    settings.includeViewTypesForAutoRefresh = ['markdown'];
    settings.excludeViewTypesForAutoRefresh = ['markdown'];
    expect(settings.isViewTypeIncluded('markdown')).toBe(false);
  });

  it('should return true when include list is empty and viewType is not excluded even with exclusions', () => {
    const settings = new PluginSettings();
    settings.excludeViewTypesForAutoRefresh = ['file-explorer'];
    expect(settings.isViewTypeIncluded('markdown')).toBe(true);
  });
});

describe('AutoRefreshMode', () => {
  it('should have expected enum values', () => {
    expect(AutoRefreshMode.ActiveView).toBe('ActiveView');
    expect(AutoRefreshMode.AllOpenViews).toBe('AllOpenViews');
    expect(AutoRefreshMode.AllVisibleViews).toBe('AllVisibleViews');
    expect(AutoRefreshMode.Off).toBe('Off');
  });
});
