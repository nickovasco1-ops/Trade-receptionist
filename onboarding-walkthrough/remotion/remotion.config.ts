import { Config } from '@remotion/cli/config';

// 1920x1080 H.264 MP4, high quality. CRF 16 keeps dark navy gradients free of
// banding, which is the failure mode on this palette — 18+ shows blocking in the
// large flat navy fields behind every screenshot.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(100);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setOverwriteOutput(true);

// Use the Chromium already installed in this environment when one is provided,
// so a render never depends on an extra download.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
