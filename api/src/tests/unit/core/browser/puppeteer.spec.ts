import { createPuppeteerLaunchOptions } from '../../../../core/browser/puppeteer';

const ORIGINAL_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH;

describe('createPuppeteerLaunchOptions', () => {
  afterEach(() => {
    if (ORIGINAL_EXECUTABLE_PATH === undefined) {
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
      return;
    }
    process.env.PUPPETEER_EXECUTABLE_PATH = ORIGINAL_EXECUTABLE_PATH;
  });

  it('omits the executable path when the environment variable is not set', () => {
    delete process.env.PUPPETEER_EXECUTABLE_PATH;

    const options = createPuppeteerLaunchOptions();

    expect(options.headless).toBe(true);
    expect(options.args).toEqual(
      expect.arrayContaining([
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ])
    );
    expect(options).not.toHaveProperty('executablePath');
  });

  it('uses the executable path from the environment variable when available', () => {
    process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium';

    const options = createPuppeteerLaunchOptions();

    expect(options.executablePath).toBe('/usr/bin/chromium');
  });
});
