# VIDEO_ASSET_PIPELINE.md — background video assets (future)

`components/visual/BackgroundVideoPanel.tsx` plays a local loop if present, else a
premium gradient fallback (no broken UI). **No videos are generated/downloaded in
RC2.** When you have a source clip, produce these files:

```
public/media/amorosi-lab-loop.webm
public/media/amorosi-lab-loop.mp4
public/media/amorosi-lab-loop-poster.webp
```

## ffmpeg recipes

Scale/crop to 1080p, strip audio, loop-friendly:

```bash
# MP4 (H.264), 1920x1080, no audio, ~2.5 Mbps
ffmpeg -i source.mov -an -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -b:v 2500k -movflags +faststart \
  public/media/amorosi-lab-loop.mp4

# WebM (VP9), smaller, no audio
ffmpeg -i source.mov -an -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" \
  -c:v libvpx-vp9 -b:v 1500k -row-mt 1 \
  public/media/amorosi-lab-loop.webm

# Poster frame (first good frame) as WebP
ffmpeg -i public/media/amorosi-lab-loop.mp4 -vf "select=eq(n\,30)" -frames:v 1 \
  public/media/amorosi-lab-loop-poster.webp
```

Tips: keep loops 6–12s, prefer dark/abstract footage, target < ~4–6 MB total.

## Usage

```tsx
import { BackgroundVideoPanel } from "@/components/visual/BackgroundVideoPanel";

<BackgroundVideoPanel className="min-h-[60vh]" overlayClassName="bg-black/40">
  {/* foreground content */}
</BackgroundVideoPanel>
```

## Future / optional (only if videos get large)
- **Cloudflare Stream** for adaptive delivery, or **Cloudflare R2** for hosting
  the mp4/webm behind a CDN. Not needed for RC2; keep assets local + small first.
- Do not couple the site to Cloudflare in RC2.
