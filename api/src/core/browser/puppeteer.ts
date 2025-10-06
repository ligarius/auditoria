import type { LaunchOptions } from 'puppeteer';

const DEFAULT_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage'
];

export function createPuppeteerLaunchOptions(): LaunchOptions {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();

  return {
    headless: true,
    args: DEFAULT_LAUNCH_ARGS,
    ...(executablePath && executablePath.length > 0 ? { executablePath } : {})
  };
}

export const puppeteerLaunchArgs = DEFAULT_LAUNCH_ARGS;
