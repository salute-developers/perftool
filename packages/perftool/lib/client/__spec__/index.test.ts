import { jest } from '@jest/globals';

import { Config } from '../../config';
import { Subject } from '../measurement/runner';
import { Task } from '../measurement/types';

describe('client/createPerfToolClient', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();

        delete (window as any).finish;
    });

    it('should get tests, run them simultaneously and call window.finish with results', async () => {
        let runTaskMock = {} as jest.Mock;
        let resolveTestsMock = {} as jest.Mock;

        const fakeTest = { task: {}, subject: {}, state: {} };
        const fakeResult = {};

        jest.unstable_mockModule('../measurement/runner', () => ({
            runTask: (runTaskMock = jest.fn(() => fakeResult)),
        }));

        jest.unstable_mockModule('../input', () => ({
            resolveTest: (resolveTestsMock = jest.fn(() => fakeTest)),
        }));

        window._perftool_finish = jest.fn() as typeof window._perftool_finish;

        const config = {} as Config;
        const subjects = [{}] as Subject[];
        const tasks = [{}] as Task<any, any>[];

        const { createPerfToolClient } = await import('..');

        await createPerfToolClient({ config, tasks, subjects });

        expect(resolveTestsMock).toHaveBeenCalledTimes(1);
        expect(resolveTestsMock).toHaveBeenCalledWith({ tasks, subjects });

        expect(runTaskMock).toHaveBeenCalledTimes(1);
        expect(runTaskMock).toHaveBeenCalledWith({
            config,
            task: fakeTest.task,
            subject: fakeTest.subject,
            state: fakeTest.state,
        });

        expect(window._perftool_finish).toHaveBeenCalledTimes(1);
        expect(window._perftool_finish).toHaveBeenCalledWith(fakeResult);
    });
});
