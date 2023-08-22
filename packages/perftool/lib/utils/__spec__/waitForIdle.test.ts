import { jest } from '@jest/globals';

import type WaitForIdleType from '../waitForIdle';

describe('utils/waitForIdle', () => {
    let waitForIdle: typeof WaitForIdleType;
    let assertMock: jest.Mock;
    let windowSpy: jest.SpiedGetter<Partial<Window>>;

    beforeEach(async () => {
        jest.unstable_mockModule('../assert', () => ({
            default: (assertMock = jest.fn((c) => {
                if (!c) {
                    throw new Error();
                }
            })),
        }));
        waitForIdle = (await import('../waitForIdle')).default;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        windowSpy = jest.spyOn(global, 'window', 'get');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
    });

    it('should call window.requestIdleCallback', async () => {
        const requestIdleCallback = jest.fn((callback: IdleRequestCallback): number => {
            callback({} as IdleDeadline);
            return 0;
        });

        windowSpy.mockImplementation(() => ({
            requestIdleCallback,
        }));

        expect(await waitForIdle()).toBeUndefined();
        expect(requestIdleCallback).toBeCalledTimes(1);
        expect(assertMock).toBeCalledTimes(1);
    });

    it('should assert if no window.requestIdleCallback', () => {
        windowSpy.mockImplementation(() => ({}));

        expect(() => waitForIdle()).toThrow();
        expect(assertMock).toBeCalledTimes(1);
    });
});
