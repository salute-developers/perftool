import { Page, Viewport } from 'puppeteer';

import { debug } from '../utils/logger';
import assert from '../utils/assert';

const DefaultSizes: Record<string, Viewport> = {
    desktop: {
        width: 1920,
        height: 1080,
    },
    touch: {
        width: 430,
        height: 932,
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
    },
};

export type SetViewportParams = Viewport | keyof typeof DefaultSizes;

export async function useViewportApi(page: Page): Promise<void> {
    async function setViewport(viewport: SetViewportParams) {
        if (typeof viewport === 'string' && viewport in DefaultSizes) {
            viewport = DefaultSizes[viewport];
        }

        assert(typeof viewport !== 'string');

        debug(
            '[viewport]',
            `setting viewport to ${viewport.width}x${viewport.height} ${viewport.hasTouch ? 'touchscreen' : ''}`,
        );
        await page.setViewport(viewport);
    }

    await page.exposeFunction('_perftool_set_viewport', setViewport);
}
