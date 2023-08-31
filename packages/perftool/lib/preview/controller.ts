import puppeteer, { Browser, Page } from 'puppeteer';

import { debug } from '../utils/logger';
import { createNewPage } from '../utils/puppeteer';
import { useInterceptApi } from '../api/intercept';
import { useViewportApi } from '../api/viewport';

class PreviewController {
    private readonly browserInstance: Browser;

    private readonly port: number;

    private workable: boolean = true;

    constructor(browserInstance: Browser, port: number) {
        this.browserInstance = browserInstance;
        this.port = port;
    }

    private waitForPageClose(page: Page): Promise<void> {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (page.isClosed() || !this.browserInstance.isConnected()) {
                    clearInterval(interval);
                    resolve();
                }
            }, 500);
        });
    }

    static async create(port: number) {
        debug('[preview]', 'launching browser...');
        const browserInstance = await puppeteer.launch({ headless: false });
        debug('[preview]', 'launched browser successfully');

        return new PreviewController(browserInstance, port);
    }

    async finalize() {
        if (!this.workable) {
            return;
        }

        debug('[preview]', 'exiting browser');

        this.workable = false;

        await this.browserInstance.close();
    }

    async start() {
        const baseUrl = `http://localhost:${this.port}`;

        const page = await createNewPage(this.browserInstance);
        await page.goto(baseUrl);

        await useInterceptApi(page);
        await useViewportApi(page);

        await page.evaluate(() => {
            window._perftool_preview_loaded = true;
            window._perftool_api_ready?.();
        });

        await this.waitForPageClose(page);
    }
}

export default PreviewController;
