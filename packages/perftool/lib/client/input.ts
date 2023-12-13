import assert from '../utils/assert';
import { debug } from '../utils/logger';
import { defer } from '../utils/deferred';
import BaseError from '../utils/baseError';

import { Task, TaskState } from './measurement/types';
import { PerftoolComponent, Subject } from './measurement/runner';

type Test<T extends Task<any, any, any>> = { subject: Subject; task: T; state: TaskState<T> };
export type RawTest<T extends Task<any, any, any>> = {
    subjectId: string;
    taskId: string;
    state: TaskState<T>;
};

export type EntrySubject = {
    id: string;
    loadComponent: () => Promise<PerftoolComponent>;
};

type ResolveTestsParams<T extends Task<any, any, any>[]> = {
    tasks: [...T];
    subjects: EntrySubject[];
};

const WAIT_TIMEOUT = 1000;

class InputTimeoutError extends BaseError {
    constructor() {
        super(`The client did not receive the test input within ${WAIT_TIMEOUT} ms`);
    }
}

export async function getTest<T extends Task<any, any, any>[]>(
    { subjectId, taskId, state }: RawTest<T[number]>,
    { tasks, subjects }: ResolveTestsParams<T>,
): Promise<Test<T[number]>> {
    const entrySubject = subjects.find(({ id }) => subjectId === id);
    const task = tasks.find(({ id }) => taskId === id);

    assert(entrySubject && task);

    const subject: Subject = { id: entrySubject.id, Component: await entrySubject.loadComponent() };

    return { subject, task, state };
}

export async function resolveTest<T extends Task<any, any, any>[]>(
    params: ResolveTestsParams<T>,
): Promise<Test<T[number]>> {
    /**
     * @see utils/window.d.ts
     */
    if (window._perftool_test) {
        debug('Test resolved from window._perftool_test');
        return getTest(window._perftool_test, params);
    }

    const apiReadyPromise = new Promise<void>((resolve) => {
        debug('Setting up global callback for test input resolution window._perftool_api_ready');
        window._perftool_api_ready = () => {
            debug('window._perftool_api_ready called');
            resolve();
        };
    });

    await Promise.race([apiReadyPromise, defer(WAIT_TIMEOUT)]);

    if (!window._perftool_test) {
        throw new InputTimeoutError();
    }

    const testInput = await getTest(window._perftool_test, params);

    debug('Test resolved from global callback');

    return testInput;
}
