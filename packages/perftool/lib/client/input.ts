import assert from '../utils/assert';

import { Task, TaskState } from './measurement/types';
import { Subject } from './measurement/runner';

type Test<T extends Task<any, any, any>> = { subject: Subject; task: T; state: TaskState<T> };
export type RawTest<T extends Task<any, any, any>> = {
    subjectId: string;
    taskId: string;
    state: TaskState<T>;
};

type ResolveTestsParams<T extends Task<any, any, any>[]> = {
    tasks: [...T];
    subjects: Subject[];
};

export function getTest<T extends Task<any, any, any>[]>(
    { subjectId, taskId, state }: RawTest<T[number]>,
    { tasks, subjects }: ResolveTestsParams<T>,
): Test<T[number]> {
    const subject = subjects.find(({ id }) => subjectId === id);
    const task = tasks.find(({ id }) => taskId === id);

    assert(subject && task);

    return { subject, task, state };
}

export async function resolveTest<T extends Task<any, any, any>[]>(
    params: ResolveTestsParams<T>,
): Promise<Test<T[number]>> {
    /**
     * @see utils/window.d.ts
     */
    if (window._perftool_test) {
        return getTest(window._perftool_test, params);
    }

    return new Promise((resolve, reject) => {
        window._perftool_api_ready = () => {
            try {
                resolve(getTest(window._perftool_test!, params));
            } catch (err) {
                reject(err);
            }
        };
    });
}
