import { jest } from '@jest/globals';

var assertMock: jest.Mock;
jest.unstable_mockModule('../assert', () => ({
    default: (assertMock = jest.fn()),
}));

const { default: waitForIdle } = await import('../waitForIdle');
const { default: assert } = await import('../assert');

describe('utils/waitForIdle', () => {
    let windowSpy: jest.SpiedGetter<Partial<Window>>;

    beforeEach(() => {
        assertMock.mockImplementation((c) => {
            if (!c) {
                throw new Error();
            }
        });

        windowSpy = jest.spyOn(global, 'window', 'get');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should call window.requestIdleCallback', () => {
        const requestIdleCallback = jest.fn((callback: IdleRequestCallback): number => {
            callback({} as IdleDeadline);
            return 0;
        });

        windowSpy.mockImplementation(() => ({
            requestIdleCallback,
        }));

        expect(waitForIdle()).resolves.toBeUndefined();
        expect(requestIdleCallback).toBeCalledTimes(1);
        expect(assert).toBeCalledTimes(1);
    });

    it('should assert if no window.requestIdleCallback', () => {
        windowSpy.mockImplementation(() => ({}));

        expect(() => waitForIdle()).toThrow();
        expect(assert).toBeCalledTimes(1);
    });
});
