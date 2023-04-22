import type { Config } from '../config/common';
import { debug } from '../utils/logger';

import type { Task } from './measurement/types';
import { runTask, Subject } from './measurement/runner';
import { resolveTests } from './input';

type CreatePerfToolClientParams<T extends Task<any, any>[]> = {
    subjects: Subject[];
    tasks: T;
    config: Config;
};

export async function createPerfToolClient<T extends Task<any, any>[]>({
    subjects,
    tasks,
    config,
}: CreatePerfToolClientParams<T>) {
    debug('Perftool client created');
    debug('Available subjects: ', subjects);
    debug('Available tasks: ', tasks);
    debug('Config: ', config);

    const tests = await resolveTests({ tasks, subjects });
    const resultPromises = [];

    debug(`Running ${tests.length} tests`);
    for (const { task, subject } of tests) {
        const resultPromise = runTask({ task, subject, config });

        resultPromises.push(resultPromise);
    }

    debug('Waiting for all tests to complete...');
    const results = await Promise.all(resultPromises);

    debug('All tests complete, calling window.finish');
    await window.finish(results);
}
