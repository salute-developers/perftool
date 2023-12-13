import { jest } from '@jest/globals';

import { bootstrapTest } from '../clientScript';

const test = { subjectId: '3', taskId: 'fake', state: {} };

describe('controller/bootstrapTest', () => {
    afterEach(() => {
        delete window._perftool_test;
    });

    it('should call window._perftool_api_ready if present', async () => {
        const page = {
            evaluate: jest.fn((cb: any, arg) => {
                cb(arg);
            }),
        };
        window._perftool_api_ready = jest.fn();

        await bootstrapTest(page as any, test);

        expect(window._perftool_test).toEqual(test);
        expect(page.evaluate).toHaveBeenCalledTimes(1);
        expect(window._perftool_api_ready).toHaveBeenCalledTimes(1);
    });
});
