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

export function getTests<T extends Task<any, any, any>[]>(
    rawTests: RawTest<T[number]>[],
    { tasks, subjects }: ResolveTestsParams<T>,
): Test<T[number]>[] {
    return rawTests.map(({ subjectId, taskId, state }) => {
        const subject = subjects.find(({ id }) => subjectId === id);
        const task = tasks.find(({ id }) => taskId === id);

        assert(subject && task);

        return { subject, task, state };
    });
}

export async function resolveTests<T extends Task<any, any, any>[]>(
    params: ResolveTestsParams<T>,
): Promise<Test<T[number]>[]> {
    /**
     * @see utils/window.d.ts
     */
    if (Array.isArray(window.tests)) {
        return getTests(window.tests, params);
    }

    return new Promise((resolve, reject) => {
        window.tests = {
            push: (...items) => {
                try {
                    resolve(getTests(items, params));
                } catch (err) {
                    reject(err);
                }
            },
        };
    });
}
