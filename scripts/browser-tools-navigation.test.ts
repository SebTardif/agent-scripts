import { describe, expect, test } from 'bun:test';
import { collectSearchResults, fetchResultContent, loadReadablePage } from './browser-tools';

describe('browser navigation failures', () => {
  test('content does not extract the tab that was already open', async () => {
    const calls: string[] = [];
    const page = {
      async goto() {
        calls.push('goto');
        throw new Error('net::ERR_TIMED_OUT');
      },
      async setBypassCSP() {
        calls.push('csp');
      },
      async evaluate() {
        calls.push('evaluate');
        return { title: 'Stale', content: 'already open', url: 'https://already-open.example' };
      },
    };

    await expect(loadReadablePage(page, 'https://example.com/missing', 1000)).rejects.toThrow('net::ERR_TIMED_OUT');
    expect(calls).toEqual(['goto']);
  });

  test('search does not parse the open tab when the results page fails', async () => {
    const calls: string[] = [];
    const page = {
      async goto() {
        calls.push('goto');
        throw new Error('net::ERR_TIMED_OUT');
      },
      async waitForSelector() {
        calls.push('wait');
      },
      async evaluate() {
        calls.push('evaluate');
        return [{ title: 'Stale', link: 'https://already-open.example', snippet: 'open tab' }];
      },
    };

    await expect(collectSearchResults(page, 'agent scripts', 3, 1000)).rejects.toThrow('net::ERR_TIMED_OUT');
    expect(calls).toEqual(['goto']);
  });

  test('a later results page failure does not parse the previous tab', async () => {
    let gotos = 0;
    let evaluations = 0;
    const page = {
      async goto() {
        gotos += 1;
        if (gotos > 1) {
          throw new Error('net::ERR_TIMED_OUT');
        }
      },
      async waitForSelector() {},
      async evaluate() {
        evaluations += 1;
        if (evaluations === 1) {
          return [{ title: 'First', link: 'https://example.com/first', snippet: 'one' }];
        }
        return [{ title: 'Stale', link: 'https://already-open.example', snippet: 'previous tab' }];
      },
    };

    await expect(collectSearchResults(page, 'agent scripts', 5, 1000)).rejects.toThrow('net::ERR_TIMED_OUT');
    expect(evaluations).toBe(1);
  });

  test('search content records the navigation error instead of the open tab', async () => {
    const calls: string[] = [];
    const page = {
      async goto() {
        calls.push('goto');
        throw new Error('net::ERR_NAME_NOT_RESOLVED');
      },
      async setBypassCSP() {
        calls.push('csp');
      },
      async evaluate() {
        calls.push('evaluate');
        return { title: 'Stale', content: 'already open', url: 'https://already-open.example' };
      },
    };

    const content = await fetchResultContent(page, 'https://example.com/missing', 1000);
    expect(content).toContain('net::ERR_NAME_NOT_RESOLVED');
    expect(content).not.toContain('already open');
    expect(calls).toEqual(['goto']);
  });

  test('a loaded results page is still read when the result selector is missing', async () => {
    const page = {
      async goto() {},
      async waitForSelector() {
        throw new Error('waiting for selector failed');
      },
      async evaluate() {
        return [{ title: 'Hit', link: 'https://example.com/hit', snippet: 'ok' }];
      },
    };

    await expect(collectSearchResults(page, 'agent scripts', 1, 1000)).resolves.toEqual([
      { title: 'Hit', link: 'https://example.com/hit', snippet: 'ok' },
    ]);
  });
});
