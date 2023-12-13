import { Page } from 'puppeteer';

import type { RawTest } from '../client/input';
import { Task } from '../client/measurement/types';

export async function bootstrapTest<T extends Task<any, any>>(page: Page, test: RawTest<T>) {
    await page.evaluate((serializedTest) => {
        window._perftool_test = serializedTest;
        window._perftool_api_ready?.();
    }, test);
}
