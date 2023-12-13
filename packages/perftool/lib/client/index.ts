import type { Config } from '../config/common';
import { debug } from '../utils/logger';
import { onError } from '../utils/ErrorBoundary';

import type { Task } from './measurement/types';
import { runTask } from './measurement/runner';
import { EntrySubject, resolveTest } from './input';

type CreatePerfToolClientParams<T extends Task<any, any>[]> = {
    subjects: EntrySubject[];
    tasks: T;
    config: Config;
};

export async function createPerfToolClient<T extends Task<any, any, any>[]>({
    subjects,
    tasks,
    config,
}: CreatePerfToolClientParams<T>) {
    debug('Perftool client created');
    debug('Available subjects: ', subjects);
    debug('Available tasks: ', tasks);
    debug('Config: ', config);

    window.addEventListener('unhandledrejection', (event) => {
        onError(event.reason);
    });

    try {
        const { task, subject, state } = await resolveTest({ tasks, subjects });

        debug(`Running...`);
        const result = await runTask<T[number]>({ task, subject, config, state });
        debug(`Test successfully finished`);

        await window._perftool_finish!(result);
    } catch (error) {
        debug('Test finished with error: ', error);
        onError(error);
    }
}
