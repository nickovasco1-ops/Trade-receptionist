# Brand Assets

Place brand assets here and reference them in components via the Remotion `staticFile()` helper.

## Expected files

| Path | Description |
|------|-------------|
| `logo/logo.svg` | Full wordmark SVG |
| `logo/icon.svg` | Square icon mark |
| `brand/colors.json` | Hex values for accent, dark, surface |
| `screenshots/app-ui.png` | App UI screenshot for product scenes |
| `audio/background.mp3` | Optional background music |

## Usage in components

```tsx
import { Img, staticFile } from "remotion";

<Img src={staticFile("logo/logo.svg")} />
```
