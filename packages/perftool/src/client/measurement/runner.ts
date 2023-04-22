import type { ComponentType } from 'react';

import type { Config } from '../../config/common';
import { getTaskConfig } from '../../config/task';
import BaseError from '../../utils/baseError';
import { defer } from '../../utils/deferred';
import { debug } from '../../utils/logger';

import { Task } from './types';

class TimeoutError extends BaseError {}

export type Subject = {
    id: string;
    Component: ComponentType;
};

type RunTaskParams<T extends Task<any, any>> = {
    subject: Subject;
    task: T;
    config: Config;
};

type SuccessResult<T extends Task<any, any>> = { result: PromiseFulfilledResult<ReturnType<T['run']>> };
type ErrorResult = { error: string };

export type RunTaskResult<T extends Task<any, any>> = {
    taskId: string;
    subjectId: string;
} & (SuccessResult<T> | ErrorResult);

function createContainer(): HTMLElement {
    const container = document.createElement('div');
    document.body.appendChild(container);

    return container;
}

export function runTask<T extends Task<any, any>>({
    task,
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
            .run({ Subject: subject.Component, config, container })
            .then((result) => {
                debug(`Test ${meta.taskId}, ${meta.subjectId} complete. Result:`, result);

                return {
                    ...meta,
                    result,
                };
            })
            .catch((error: Error) => {
                debug(`Test ${meta.taskId}, ${meta.subjectId} failed. Error:`, error);

                return {
                    ...meta,
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

            return { ...meta, error: new TimeoutError().toString() };
        }),
    ]);
}
