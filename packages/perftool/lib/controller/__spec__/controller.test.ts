import { jest } from '@jest/globals';

import TestController from '../controller';
import type { Config } from '../../config';
import { IPlanner } from '../planner';
import { IExecutor, Test } from '../executor';
import BaseError from '../../utils/baseError';

describe('controller/TestController', () => {
    it('should request a schedule from planner and execute tasks in parallel yielding the result', async () => {
        const tests: Test[] = [
            { subjectId: 'fakeId1', taskId: 'fakeTask1' },
            { subjectId: 'fakeId2', taskId: 'fakeTask2' },
            { subjectId: 'fakeId3', taskId: 'fakeTask3' },
            { subjectId: 'fakeId4', taskId: 'fakeTask5' },
        ];

        const config = {
            jobs: 3,
        } as Config;
        const planner: IPlanner = {
            plan: jest.fn(function* () {
                for (const test of tests) {
                    yield test;
                }

                return undefined;
            }),
        };
        const executor: IExecutor<any> = {
            execute: jest.fn((t) => {
                return Promise.resolve(t as any);
            }),
        };
        const testController = new TestController(config, planner, executor);

        const generator = testController.run();
        const firstPromise = generator.next(); // trigger generator state

        expect(executor.execute).toHaveBeenCalledTimes(config.jobs);
        expect(planner.plan).toHaveBeenCalledTimes(1);

        const generatorResult = [(await firstPromise).value];

        for await (const result of generator) {
            generatorResult.push(result);
        }

        expect(new Set(generatorResult)).toEqual(new Set(tests));
    });

    it('should not pass dry runs to the result', async () => {
        const tests: Test[] = [
            { subjectId: 'fakeId1', taskId: 'fakeTask1', type: 'dry' },
            { subjectId: 'fakeId2', taskId: 'fakeTask2' },
            { subjectId: 'fakeId3', taskId: 'fakeTask3', type: 'dry' },
            { subjectId: 'fakeId4', taskId: 'fakeTask5' },
        ];

        const config = {
            jobs: 2,
        } as Config;
        const planner = {
            plan: jest.fn(function* () {
                for (const test of tests) {
                    yield test;
                }

                return undefined;
            }),
        };
        const executor = {
            execute: jest.fn((t) => {
                return Promise.resolve(t as any);
            }),
        };
        const testController = new TestController(config, planner, executor);
        const generator = testController.run();
        const generatorResult = [];

        for await (const result of generator) {
            generatorResult.push(result);
        }

        expect(new Set(generatorResult)).toEqual(new Set(tests.filter((test) => test?.type !== 'dry')));
    });

    it('should throw if execute returns an error', async () => {
        const tests: Test[] = [
            { subjectId: 'fakeId3', taskId: 'fakeTask3', type: 'dry' },
            { subjectId: 'fakeId4', taskId: 'fakeTask5' },
        ];

        const config = {
            jobs: 1,
        } as Config;
        const planner = {
            plan: jest.fn(function* () {
                for (const test of tests) {
                    yield test;
                }

                return undefined;
            }),
        };
        const executor = {
            execute: jest.fn(() => {
                return Promise.resolve(new BaseError('test'));
            }),
        };
        const testController = new TestController(config, planner, executor);
        const generator = testController.run();
        const generatorResult = [];

        expect(async () => {
            for await (const result of generator) {
                generatorResult.push(result);
            }
        }).rejects.toThrow();
    });
});
