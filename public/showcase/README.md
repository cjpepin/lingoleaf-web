# LingoLeaf showcase assets

Place recruiter-facing media here. Paths are served at `/lingoleaf/showcase/` after build.

| File | Purpose |
|------|---------|
| `lingoleaf-recruiter.mp4` | 18–20s horizontal demo video (1920×1080, H.264) |
| `lingoleaf-recruiter-poster.jpg` | Video poster / fallback (~1280px wide) |
| `read_translate.png` | Story tab: read & translate screenshot |
| `save.png` | Story tab: save & organize screenshot |
| `study.png` | Story tab: review & progress screenshot |

Optional: `lingoleaf-recruiter.vtt` for video captions.

Until files are added, the showcase section shows a styled fallback.

## Recording the video (native iOS)

Use the LingoLeaf subproject — **not** the web embed — for App Store–quality captures.

```bash
cd projects/lingoleaf
cp .env.example .env   # demo Supabase URL + anon key (seeded catalog)
npm install
npm run ios:recording
```

Options:

| Flag | Purpose |
|------|---------|
| `--reset-app` | Uninstall app first (fresh onboarding/tutorial state) |
| `--skip-typecheck` | Faster relaunch between takes |
| `--clean` | Clear DerivedData before build |
| `SIMULATOR_NAME="iPhone 16 Pro" npm run ios:recording` | Different device |

Record via **Simulator → File → Record Screen** or QuickTime. Storyboard timings are printed when the script starts.

After export, copy assets into this folder and run `npm run sync:lingoleaf-web` from `apps/portfolio`.
