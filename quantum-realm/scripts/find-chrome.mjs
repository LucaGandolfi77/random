// Locates a Chrome/Chromium binary for the browser-driven tests.
// playwright-core deliberately ships no browser of its own, and hardcoding one
// path makes `npm test` fail for everyone who is not on this machine.
import { existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'

const CANDIDATES =
  platform() === 'darwin'
    ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        `${homedir()}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
      ]
    : platform() === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        ]
      : [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/snap/bin/chromium',
        ]

/** @returns the binary, or null when none is installed. */
export const findChrome = () => {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH
  }
  return CANDIDATES.find((p) => existsSync(p)) ?? null
}

export const requireChrome = () => {
  const bin = findChrome()
  if (!bin) {
    console.error(
      [
        'No Chrome or Chromium found.',
        'The browser tests need one. Install Google Chrome, or point CHROME_PATH at a binary:',
        '  CHROME_PATH=/path/to/chrome npm run controls',
      ].join('\n'),
    )
    process.exit(1)
  }
  return bin
}
