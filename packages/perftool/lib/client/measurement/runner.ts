import type { ComponentType } from 'react';

import type { ClientConfig } from '../../config/common';
import { getTaskConfig } from '../../config/task';
import BaseError from '../../utils/baseError';
import { defer } from '../../utils/deferred';
import { debug } from '../../utils/logger';
import createContainer from '../../utils/createContainer';

import { Task, TaskState } from './types';

class TimeoutError extends BaseError {}

export type PerftoolComponent = ComponentType & { beforeTest?: () => Promise<void> | void };

export type Subject = {
    id: string;
    Component: PerftoolComponent;
};

type RunTaskParams<T extends Task<any, any, any>> = {
    subject: Subject;
    task: T;
    config: ClientConfig;
    state: TaskState<T>;
};

export type RunTaskResult<T extends Task<any, any, any>> = {
    taskId: string;
    subjectId: string;
    state?: TaskState<T>;
    result: PromiseFulfilledResult<ReturnType<T['run']>>;
    isBaseline?: boolean;
};

export async function runTask<T extends Task<any, any, any>>({
    task,
    state,
    subject,
    config: globalConfig,
}: RunTaskParams<T>): Promise<RunTaskResult<T>> {
    const meta = { taskId: task.id, subjectId: subject.id };
    const config = getTaskConfig(task, globalConfig);
    const container = createContainer();
    let isComplete = false;

    debug('Running test\n', `TaskId: ${meta.taskId}\n`, `SubjectId: ${meta.subjectId}`);
    debug('Task config: ', config);

    if (typeof subject.Component.beforeTest === 'function') {
        debug('Running beforeTest');
        await subject.Component.beforeTest();
    }

    return Promise.race([
        task
            .run({ Subject: subject.Component, config, container, state })
            .then((result) => {
                debug(`Test ${meta.taskId}, ${meta.subjectId} complete. Result:`, result);

                return {
                    ...meta,
                    state,
                    result,
                };
            })
            .catch((error: Error) => {
                debug(`Test ${meta.taskId}, ${meta.subjectId} failed. Error:`, error);

                throw error;
            })
            .finally(() => {
                isComplete = true;
            }),
        defer(globalConfig.taskWaitTimeout, () => {
            if (isComplete) {
                return undefined as never;
            }

            throw new TimeoutError(`Test ${meta.taskId}, ${meta.subjectId} timed out`);
        }),
    ]);
}
