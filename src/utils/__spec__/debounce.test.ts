import { jest } from '@jest/globals';

import debounce from '../debounce';
import { defer } from '../deferred';

describe('utils/debounce', () => {
    it('should return decorated function', () => {
        expect(typeof debounce(() => null, 0)).toEqual('function');
    });

    test('decorated function call should eventually result in original function call', async () => {
        const originalFn = jest.fn();
        const decorated = debounce(originalFn, 0);

        decorated();
        await defer(1);

        expect(originalFn).toHaveBeenCalledTimes(1);
    });

    test('decorated function calls that have been made in a time window should result in single call', async () => {
        const originalFn = jest.fn();
        const decorated = debounce(originalFn, 2);

        decorated();
        decorated();
        decorated();
        await defer(3);

        expect(originalFn).toHaveBeenCalledTimes(1);

        decorated();
        decorated();
        await Promise.resolve();
        decorated();
        decorated();

        expect(originalFn).toHaveBeenCalledTimes(1);

        await defer(3);

        expect(originalFn).toHaveBeenCalledTimes(2);
    });
});
