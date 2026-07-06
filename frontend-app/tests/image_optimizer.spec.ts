import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { optimizeUploadedImage } from "@/lib/media/image-optimizer";

describe("uploaded image optimizer", () => {
  it("converts heavy PNG uploads to smaller WebP files", async () => {
    const input = await sharp({
      create: {
        width: 2400,
        height: 1600,
        channels: 3,
        background: { r: 28, g: 90, b: 180 },
      },
    })
      .png()
      .toBuffer();

    const output = await optimizeUploadedImage({ buffer: input, ext: ".png" });

    expect(output.optimized).toBe(true);
    expect(output.ext).toBe(".webp");
    expect(output.outputBytes).toBeLessThan(output.originalBytes);
    expect(output.reason).toBe("converted_webp");
  });

  it("keeps small already-light images unchanged", async () => {
    const input = await sharp({
      create: {
        width: 160,
        height: 160,
        channels: 3,
        background: { r: 12, g: 14, b: 20 },
      },
    })
      .jpeg({ quality: 72 })
      .toBuffer();

    const output = await optimizeUploadedImage({ buffer: input, ext: ".jpg" });

    expect(output.optimized).toBe(false);
    expect(output.ext).toBe(".jpg");
    expect(output.outputBytes).toBe(input.length);
    expect(output.reason).toBe("below_threshold");
  });
});
