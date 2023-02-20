import { jest } from '@jest/globals';

import { Config } from '../../config';
import { Task } from '../../client/measurement/types';
import { TestModule } from '../../build/collect';
import { Test } from '../executor';
import { id as staticTaskSubjectId } from '../../stabilizers/staticTask';

describe('controller/planner/getTests', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
    });

    it('should make tests for every task and module', async () => {
        const config = {
            stabilizers: [],
        } as unknown as Config;
        const tasks = [{ id: 'fakeTaskId1' }, { id: 'fakeTaskId2' }] as Task<any, any>[];
        const modules = [
            { path: 'foo/bar/baz.ts', subjects: [{ id: 'fakeSubjId1', originalExportedName: 'Default' }] },
            { path: 'kek/top.ts', subjects: [{ id: 'fakeSubjId2', originalExportedName: 'FakeNamed' }] },
        ] as TestModule[];
        const expectedResult = tasks.reduce((acc, task) => {
            for (const module of modules) {
                for (const subject of module.subjects) {
                    acc.push({ taskId: task.id, subjectId: subject.id });
                }
            }
            return acc;
        }, [] as Test[]);

        const { getTests } = await import('../planner');
        const result = getTests(config, tasks, modules);

        expect(new Set(result)).toEqual(new Set(expectedResult));
    });

    it('should add static task stabilizer if needed', async () => {
        const config = {
            stabilizers: [staticTaskSubjectId],
        } as Config;
        const tasks = [
            { id: 'fakeTaskId1', availableStabilizers: [staticTaskSubjectId] },
            { id: 'fakeTaskId2' },
        ] as Task<any, any>[];
        const modules = [
            { path: 'foo/bar/baz.ts', subjects: [{ id: 'fakeSubjId1', originalExportedName: 'Default' }] },
        ] as TestModule[];
        const expectedResult = tasks.reduce((acc, task) => {
            for (const module of modules) {
                for (const subject of module.subjects) {
                    acc.push({ taskId: task.id, subjectId: subject.id });
                }
            }
            return acc;
        }, [] as Test[]);
        expectedResult.push({ taskId: tasks[0].id, subjectId: staticTaskSubjectId });

        const { getTests } = await import('../planner');
        const result = getTests(config, tasks, modules);

        expect(new Set(result)).toEqual(new Set(expectedResult));
    });
});

describe('controller/Planner', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
    });

    it('should yield idempotent tasks once and in one group', async () => {
        const config = {
            dryRunTimes: 3,
            retries: 10,
            stabilizers: [],
        } as unknown as Config;
        const tasks = [
            { id: 'fakeTaskId1', isIdempotent: true },
            { id: 'fakeTaskId2', isIdempotent: true },
        ] as Task<any, any>[];
        const modules = [
            { path: 'foo/bar/baz.ts', subjects: [{ id: 'fakeSubjId1', originalExportedName: 'Default' }] },
        ] as TestModule[];
        const expectedResult = tasks.reduce((acc, task) => {
            for (const module of modules) {
                for (const subject of module.subjects) {
                    acc.push({ taskId: task.id, subjectId: subject.id });
                }
            }
            return acc;
        }, [] as Test[]);

        const { default: Planner } = await import('../planner');

        const planner = new Planner(config, tasks, modules);

        const result = [];

        for (const testGroup of planner.plan()) {
            result.push(testGroup);
        }

        expect(new Set(result[0])).toEqual(new Set(expectedResult));
    });

    it('should yield non-idempotent tasks given number of times', async () => {
        const config = {
            dryRunTimes: 0,
            retries: 10,
            stabilizers: [],
        } as unknown as Config;
        const tasks = [{ id: 'fakeTaskId1', isIdempotent: true }, { id: 'fakeTaskId2' }] as Task<any, any>[];
        const modules = [
            { path: 'foo/bar/baz.ts', subjects: [{ id: 'fakeSubjId1', originalExportedName: 'Default' }] },
        ] as TestModule[];

        const { default: Planner } = await import('../planner');

        const planner = new Planner(config, tasks, modules);

        const result = [];

        for (const testGroup of planner.plan()) {
            result.push(testGroup);
        }

        expect(result.filter((tests) => tests[0].taskId === tasks[0].id)).toHaveLength(1);
        expect(result.filter((tests) => tests[0].taskId === tasks[1].id && tests[0].type !== 'dry')).toHaveLength(
            config.retries,
        );
    });

    it('should yield non-idempotent tasks with specified number of dry-runs', async () => {
        const config = {
            dryRunTimes: 3,
            retries: 5,
            stabilizers: [],
        } as unknown as Config;
        const tasks = [{ id: 'fakeTaskId2' }] as Task<any, any>[];
        const modules = [
            { path: 'foo/bar/baz.ts', subjects: [{ id: 'fakeSubjId1', originalExportedName: 'Default' }] },
        ] as TestModule[];

        const { default: Planner } = await import('../planner');

        const planner = new Planner(config, tasks, modules);

        const result = [];

        for (const testGroup of planner.plan()) {
            result.push(testGroup);
        }

        expect(result.filter((tests) => tests[0].taskId === tasks[0].id && tests[0].type !== 'dry')).toHaveLength(
            config.retries,
        );
        expect(result.filter((tests) => tests[0].taskId === tasks[0].id && tests[0].type === 'dry')).toHaveLength(
            config.dryRunTimes,
        );
    });
});
