import { Browser, Page } from 'puppeteer';

import { debug } from './logger';

const PUPPETEER_MYSTERY_ERROR_RETRIES = 5;

export async function createNewPage(browser: Browser): Promise<Page> {
    let page: Page = undefined as unknown as Page;

    for (let retry = 0; !page && retry < PUPPETEER_MYSTERY_ERROR_RETRIES; ++retry) {
        try {
            page = await browser.newPage();
        } catch (e) {
            debug('[createNewPage]', 'Mystery puppeteer error, retrying', e);

            if (retry + 1 === PUPPETEER_MYSTERY_ERROR_RETRIES) {
                page = await browser.newPage();
            }
        }
    }

    return page;
}
