import type { Config } from '../config/common';
import { debug } from '../utils/logger';

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

    const { task, subject, state } = await resolveTest({ tasks, subjects });

    debug(`Running...`);

    const result = await runTask<T[number]>({ task, subject, config, state });
    await window._perftool_finish!(result);
}
