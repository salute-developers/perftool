import type { ComponentType } from 'react';

import type { Config } from '../../config/common';
import { getTaskConfig } from '../../config/task';
import BaseError from '../../utils/baseError';
import { defer } from '../../utils/deferred';
import { debug } from '../../utils/logger';

import { Task, TaskState } from './types';

class TimeoutError extends BaseError {}

export type Subject = {
    id: string;
    Component: ComponentType;
};

type RunTaskParams<T extends Task<any, any, any>> = {
    subject: Subject;
    task: T;
    config: Config;
    state: TaskState<T>;
};

type SuccessResult<T extends Task<any, any, any>> = { result: PromiseFulfilledResult<ReturnType<T['run']>> };
type ErrorResult = { error: string };

export type RunTaskResult<T extends Task<any, any, any>> = {
    taskId: string;
    subjectId: string;
    state?: TaskState<T>;
} & (SuccessResult<T> | ErrorResult);

function createContainer(): HTMLElement {
    const container = document.createElement('div');
    document.body.appendChild(container);

    return container;
}

export function runTask<T extends Task<any, any, any>>({
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

                return {
                    ...meta,
                    state,
                    error: error.toString(),
                };
            })
            .finally(() => {
                isComplete = true;
            }),
        defer(globalConfig.taskWaitTimeout, () => {
            if (!isComplete) {
                debug(`Test ${meta.taskId}, ${meta.subjectId} timed out`);
            }

            return { ...meta, state, error: new TimeoutError().toString() };
        }),
    ]);
}
