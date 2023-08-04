import { jest } from '@jest/globals';
import React from 'react';

import type { Task } from '../measurement/types';
import { EntrySubject } from '../input';

describe('client/input/getTest', () => {
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

    it('should transform raw test with ids into test with component and task', async () => {
        let loadComponentMock;
        const fakeTasks = [{ id: 'fakeTaskId1' }, { id: 'fakeTaskId2' }, { id: 'fakeTaskId3' }] as Task<any, any>[];
        const fakeSubjects = [
            {
                id: 'fakeSubjectId1',
                loadComponent: (loadComponentMock = jest.fn(async () => ({}) as React.ComponentType)),
            },
        ] as EntrySubject[];
        const state = { state: '' };
        const fakeRawTest = { subjectId: fakeSubjects[0].id, taskId: fakeTasks[0].id, state };

        const { getTest } = await import('../input');

        const result = await getTest(fakeRawTest, { tasks: fakeTasks, subjects: fakeSubjects });

        expect(result).toEqual({ subject: { id: fakeSubjects[0].id, Component: {} }, task: fakeTasks[0], state });
        expect(assertMock).toHaveBeenCalledTimes(1);
        expect(loadComponentMock).toHaveBeenCalledTimes(1);
    });

    it('should throw if task not found', async () => {
        const fakeTasks = [{ id: 'fakeTaskId1' }] as Task<any, any>[];
        const fakeSubjects = [{ id: 'fakeSubjectId1' }] as EntrySubject[];
        const fakeRawTest = { subjectId: fakeSubjects[0].id, taskId: 'fakeTaskId2', state: {} };

        const { getTest } = await import('../input');

        expect(() => getTest(fakeRawTest, { tasks: fakeTasks, subjects: fakeSubjects })).rejects.toThrow();

        expect(assertMock).toHaveBeenCalledTimes(1);
    });

    it('should throw if subject not found', async () => {
        const fakeTasks = [{ id: 'fakeTaskId1' }] as Task<any, any>[];
        const fakeSubjects = [{ id: 'fakeSubjectId1' }] as EntrySubject[];
        const fakeRawTest = { subjectId: 'fakeSubjectId2', taskId: fakeTasks[0].id, state: {} };

        const { getTest } = await import('../input');

        expect(() => getTest(fakeRawTest, { tasks: fakeTasks, subjects: fakeSubjects })).rejects.toThrow();

        expect(assertMock).toHaveBeenCalledTimes(1);
    });
});

describe('client/input/resolveTest', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();

        delete window._perftool_api_ready;
        delete window._perftool_test;
    });

    it('should call getTests if window._perftool_test is present', async () => {
        const tasks = [{ id: 'fakeTaskId' }] as any[];
        const subjects = [{ id: 'fakeSubjectId2', loadComponent: async () => ({}) }] as any[];
        const fakeRawTest = { subjectId: 'fakeSubjectId2', taskId: 'fakeTaskId', state: {} };
        const fakeResult = { subject: { id: subjects[0].id, Component: {} }, task: tasks[0], state: fakeRawTest.state };

        window._perftool_test = fakeRawTest;

        const { resolveTest } = await import('../input');
        const result = await resolveTest({ tasks, subjects });

        expect(result).toEqual(fakeResult);
        expect(window._perftool_test).toEqual(fakeRawTest);
    });

    it("should create window._perftool_api_ready if test isn't present", async () => {
        const tasks = [{ id: 'fakeTaskId' }] as any[];
        const subjects = [{ id: 'fakeSubjectId2', loadComponent: async () => ({}) }] as any[];
        const fakeRawTest = { subjectId: 'fakeSubjectId2', taskId: 'fakeTaskId', state: {} };
        const fakeResult = { subject: { id: subjects[0].id, Component: {} }, task: tasks[0], state: fakeRawTest.state };

        const { resolveTest } = await import('../input');
        const resultPromise = resolveTest({ tasks, subjects });

        window._perftool_test = fakeRawTest;
        window._perftool_api_ready?.();

        expect(resultPromise).resolves.toEqual(fakeResult);
    });

    it('should reject if error while transforming tests', async () => {
        const tasks = [] as Task<any, any>[];
        const subjects = [] as EntrySubject[];
        const fakeRawTest = { subjectId: 'fakeSubjectId2', taskId: 'fakeTaskId', state: {} };

        const { resolveTest } = await import('../input');
        const resultPromise = resolveTest({ tasks, subjects });

        window._perftool_test = fakeRawTest;
        window._perftool_api_ready?.();

        expect(resultPromise).rejects.toThrow();
    });
});
