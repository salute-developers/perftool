import { Page, Viewport } from 'puppeteer';
import { shallowEqualObjects } from 'shallow-equal';

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

export type ViewportState = Partial<Viewport>;

export type SetViewportParams = Viewport | keyof typeof DefaultSizes;

export async function useViewportApi(
    page: Page,
    state: ViewportState = {},
    onRefresh: () => void = () => undefined,
): Promise<void> {
    // Save the current state to avoid race condition
    const currentState = { ...state };

    // Set the cached state
    if (currentState.height && currentState.width) {
        debug('[viewport]', 'using cached viewport settings');
        await page.setViewport(currentState as Viewport);
    }

    async function setViewport(viewport: SetViewportParams) {
        if (typeof viewport === 'string' && viewport in DefaultSizes) {
            viewport = DefaultSizes[viewport];
        }

        assert(typeof viewport !== 'string');

        if (shallowEqualObjects(viewport, currentState)) {
            debug('[viewport]', `viewport is already set`);
            return;
        }

        debug(
            '[viewport]',
            `setting viewport to ${viewport.width}x${viewport.height} ${viewport.hasTouch ? 'touchscreen' : ''}`,
        );
        await page.setViewport(viewport);

        if (viewport.hasTouch !== currentState.hasTouch || viewport.isMobile !== currentState.hasTouch) {
            debug('[viewport]', 'notify caller that refresh happened');
            await onRefresh();
        }

        // Save the shared state with the viewport settings to avoid reload every iteration
        Object.assign(state, viewport);
    }

    await page.exposeFunction('_perftool_set_viewport', setViewport);
}
