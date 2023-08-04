import { jest } from '@jest/globals';

import Cache from '../../cache';
import { Config } from '../../config';
import { Task } from '../../client/measurement/types';
import { TestModule } from '../../build/collect';

describe('controller/runTests', () => {
    it('should create Executor, Planner and Controller, run tests, yield results and finalize executor', async () => {
        let createMock = {} as jest.Mock;
        let finalizeMock = {} as jest.Mock;
        let fakePlannerCtorMock = {} as jest.Mock;
        let fakeControllerCtorMock = {} as jest.Mock;
        let runMock = {} as jest.Mock;
        let plannerInstance;
        let executorInstance;
        const results = ['res1', 'res2', 'res3'];
        const port = Math.trunc(Math.random() * 2 ** 16);
        const config = { cache: {} } as Config;
        const cache = {} as Cache;
        const tasks = [{ id: 'fakeTaskId2' }] as Task<any, any>[];
        const testModules = [
            { path: 'foo/bar/baz.ts', subjects: [{ id: 'fakeSubjId1', originalExportedName: 'Default' }] },
        ] as TestModule[];
        jest.unstable_mockModule('../executor', () => ({
            default: class FakeExecutor {
                static create: any = (createMock = jest.fn(
                    () =>
                        (executorInstance = {
                            finalize: (finalizeMock = jest.fn()),
                        }),
                ));
            },
        }));
        jest.unstable_mockModule('../planner', () => ({
            // eslint-disable-next-line prefer-arrow-callback
            default: (fakePlannerCtorMock = jest.fn(function FakePlanner(this: any) {
                // eslint-disable-next-line @typescript-eslint/no-this-alias
                plannerInstance = this;
            })),
        }));
        jest.unstable_mockModule('../controller', () => ({
            // eslint-disable-next-line prefer-arrow-callback
            default: (fakeControllerCtorMock = jest.fn(function Controller(this: any) {
                this.run = runMock = jest.fn(async function* () {
                    for (const r of results) {
                        yield r;
                    }
                });
            })),
        }));

        const { runTests } = await import('..');
        const result = [];

        for await (const r of runTests({ cache, config, port, tasks, testModules })) {
            result.push(r);
        }

        expect(result).toEqual(results);

        expect(createMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledWith(config, cache, port);

        expect(fakePlannerCtorMock).toHaveBeenCalledTimes(1);
        expect(fakePlannerCtorMock).toHaveBeenCalledWith(config, tasks, testModules);

        expect(fakeControllerCtorMock).toHaveBeenCalledTimes(1);
        expect(fakeControllerCtorMock).toHaveBeenCalledWith(config, plannerInstance, executorInstance);

        expect(runMock).toHaveBeenCalledTimes(1);
        expect(finalizeMock).toHaveBeenCalledTimes(1);
    });
});
