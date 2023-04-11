import { jest } from '@jest/globals';

import type { Task } from '../measurement/types';
import type { Subject } from '../measurement/runner';

describe('client/input/getTests', () => {
    let assertMock = {} as jest.Mock;
    beforeEach(() => {
        jest.unstable_mockModule('../../utils/assert', () => ({
            default: (assertMock = jest.fn((assertion) => {
                if (!assertion) {
                    throw new Error();
                }
            })),
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
    });

    it('should transform raw tests with ids into tests with component and task', async () => {
        const fakeTasks = [{ id: 'fakeTaskId1' }, { id: 'fakeTaskId2' }, { id: 'fakeTaskId3' }] as Task<any, any>[];
        const fakeSubjects = [
            { id: 'fakeSubjectId1' },
            { id: 'fakeSubjectId2' },
            { id: 'fakeSubjectId3' },
        ] as Subject[];
        const fakeRawTests = [
            { subjectId: fakeSubjects[0].id, taskId: fakeTasks[0].id },
            { subjectId: fakeSubjects[1].id, taskId: fakeTasks[2].id },
        ];

        const { getTests } = await import('../input');

        const result = getTests(fakeRawTests, { tasks: fakeTasks, subjects: fakeSubjects });

        expect(result).toEqual([
            { subject: fakeSubjects[0], task: fakeTasks[0] },
            { subject: fakeSubjects[1], task: fakeTasks[2] },
        ]);

        expect(assertMock).toHaveBeenCalledTimes(fakeRawTests.length);
    });

    it('should throw if task not found', async () => {
        const fakeTasks = [{ id: 'fakeTaskId1' }] as Task<any, any>[];
        const fakeSubjects = [{ id: 'fakeSubjectId1' }] as Subject[];
        const fakeRawTests = [{ subjectId: fakeSubjects[0].id, taskId: 'fakeTaskId2' }];

        const { getTests } = await import('../input');

        expect(() => {
            getTests(fakeRawTests, { tasks: fakeTasks, subjects: fakeSubjects });
        }).toThrow();

        expect(assertMock).toHaveBeenCalledTimes(fakeRawTests.length);
    });

    it('should throw if subject not found', async () => {
        const fakeTasks = [{ id: 'fakeTaskId1' }] as Task<any, any>[];
        const fakeSubjects = [{ id: 'fakeSubjectId1' }] as Subject[];
        const fakeRawTests = [{ subjectId: 'fakeSubjectId2', taskId: fakeTasks[0].id }];

        const { getTests } = await import('../input');

        expect(() => {
            getTests(fakeRawTests, { tasks: fakeTasks, subjects: fakeSubjects });
        }).toThrow();

        expect(assertMock).toHaveBeenCalledTimes(fakeRawTests.length);
    });
});

describe('client/input/resolveTests', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();

        delete window.tests;
    });

    it('should call getTests if window.tests is present', async () => {
        const tasks = [] as Task<any, any>[];
        const subjects = [] as Subject[];
        const fakeRawTests = [] as any[];
        const fakeResult = [] as any[];

        window.tests = fakeRawTests;

        const { resolveTests } = await import('../input');
        const result = await resolveTests({ tasks, subjects });

        expect(result).toEqual(fakeResult);

        expect(window.tests).toEqual(fakeRawTests);
    });

    it("should imitate an array in window.tests if it's not present", async () => {
        const tasks = [] as Task<any, any>[];
        const subjects = [] as Subject[];
        const fakeRawTests = [] as any[];
        const fakeResult = [] as any[];

        const { resolveTests } = await import('../input');
        const resultPromise = resolveTests({ tasks, subjects });

        window.tests?.push(...fakeRawTests);

        expect(resultPromise).resolves.toEqual(fakeResult);
    });

    it('should reject if error while transforming tests', async () => {
        const tasks = [] as Task<any, any>[];
        const subjects = [] as Subject[];
        const fakeRawTests = [{ subjectId: 'fakeSubjectId2', taskId: 'fakeTaskId' }];

        const { resolveTests } = await import('../input');
        const resultPromise = resolveTests({ tasks, subjects });

        window.tests?.push(...fakeRawTests);

        expect(resultPromise).rejects.toThrow();
    });
});
