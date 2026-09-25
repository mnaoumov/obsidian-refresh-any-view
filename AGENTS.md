# AGENTS.md

## Testing notes

### The mobile screenshot capture suite

The mobile frames are captured by **two different routes**, and which route a frame takes is a decision about that frame rather than a style choice:

- **A frame whose subject is not a focused field captures the PAGE** (`captureObsidianScreenshot`), which is byte-reproducible: no status bar and no clock, so re-capturing an unchanged frame leaves no diff. A real phone shows no keyboard on such a screen either, so raising one would make the frame *less* true.
- **A frame whose subject IS a focused field captures the DEVICE** (`captureDeviceScreenshot`), with the soft keyboard raised first. A page capture cannot show a keyboard: it drives Appium in the WebView context, so it photographs the page, and the IME is a system window that is not part of the page. That left the command-palette frame as a search field over a large empty band, with the caption band — drawn across the bottom of the image — landing on the field and clipping the typed text. Do not put it back on the page capture, and do not switch the other frames over for consistency.
- **The device frame is byte-reproducible too, but only because three things are removed from it**, each where it arises (measured 2026-09-25: three capture runs, identical bytes for both frames):
  - The status-bar clock and battery: `paintOutStatusBar` fills the band. Its `STATUS_BAR_HEIGHT_IN_PIXELS` (48) is measured on this AVD, and the harness refuses the capture rather than painting over the app if it goes stale.
  - The blinking caret: `hideCaret` around the capture, since a device capture has no page channel to hide it by itself.
  - Gboard's suggestion strip, which raced between its toolbar and word predictions that change from run to run: `raiseSoftKeyboard` (obsidian-integration-testing 17.2.0 and later) parks the caret at offset 0, so the strip is always the toolbar.

  If the frame starts churning again, diff two captures and find which of the three came back; do not accept the churn.
- **Raising the keyboard takes TWO things**, which is why both belong to `obsidian-integration-testing` rather than being copied in here. The AVD is built with a hardware keyboard attached, so Android suppresses the on-screen one entirely — `withSoftKeyboardEnabled` lifts that for the duration of a shot and restores the device exactly, including restoring a setting that had never been written, which takes a delete rather than a write. And a WebView will not ask for an IME on programmatic focus alone: `raiseSoftKeyboard` lands a real touch on the field and then proves geometrically that it lifted, because nothing in the page reports the keyboard — `innerHeight`, `visualViewport` and the modal container all keep their full height with it shown. A failure writes the device framebuffer and the device's own input-method state to `dist/screenshots/`, because a bare assertion failure here is unreadable.
- **A passing lift check is not the same as a good frame.** The check asks whether the FIELD moved clear of the bottom; it cannot tell you the keyboard covered the thing the shot is evidence for. So look at a switched frame, every time, rather than trusting the measurement alone.
- **The field it touches is read off the suite, not assumed.** The command palette renders `.prompt input`, which is not the `.prompt-input` a suggester renders.
