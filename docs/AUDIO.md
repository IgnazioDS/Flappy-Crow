# Audio — intentionally deferred (v6.0.2)

## Current state

All three themes (`classic`, `emerald-lake`, `evil-forest`) ship with an empty
`audio: {}` block in their `ThemeDefinition`.  The `SoundSystem` is fully
implemented and guarded (deduplication, rate-limiting, mute toggle, safe
teardown) but plays nothing because no SFX keys are wired.

## Why it is intentionally empty

1. **No audio assets exist yet.** Adding Web Audio playback without files would
   produce runtime errors, so `audio: {}` is the safe, intentional fallback.
2. **SoundSystem is production-ready.** The infrastructure (`SoundSystem.ts`,
   `ThemeAudio` type, theme contract) is already in place; only the asset
   files and key assignments are missing.
3. **App Store review risk.** Submitting with placeholder or low-quality audio
   invites rejection; deferring until final-quality SFX are available is
   preferable.

## Roadmap — Path A (when audio assets are ready)

For each theme, populate the `audio` field in its `ThemeDefinition`:

```ts
audio: {
  sfx: {
    flap:     '<key>',   // loaded in BootScene
    score:    '<key>',
    hit:      '<key>',
    uiTap:    '<key>',
    gameOver: '<key>',
  },
  // ambience optional per theme
}
```

Then load the assets in `BootScene.ts` using `this.load.audio(key, path)` and
call the appropriate `SoundSystem` methods at the relevant game events.

## Attribution

When audio assets are added, list their licence here (CC0, royalty-free
licence, or original composition).
