import { Config } from '../config';
import { Task } from '../client/measurement/types';
import { RunTaskResult } from '../client/measurement/runner';
import combineGenerators from '../utils/combineGenerators';
import { debug, warn } from '../utils/logger';

import { IExecutor, Test } from './executor';
import { IPlanner } from './planner';

export default class TestController<T extends Task<any, any>[]> {
    private readonly config: Config;

    private readonly planner: IPlanner;

    private readonly executor: IExecutor<T>;

    private readonly retryCounter: Record<string, number> = {};

    constructor(config: Config, planner: IPlanner, executor: IExecutor<T>) {
        this.config = config;
        this.executor = executor;
        this.planner = planner;
    }

    async *run(): AsyncGenerator<RunTaskResult<T[number]>, undefined> {
        const { executor, handleErrorResult, resetTimeoutCounter } = this;
        const schedule = this.planner.plan();

        const start = async function* start() {
            for (const test of schedule) {
                const result = await executor.execute(test);

                if (result instanceof Error) {
                    handleErrorResult(result, test);
                    continue;
                }

                resetTimeoutCounter(result);

                if (test.type === 'dry') {
                    debug('[controller]', 'current run is dry, skipping');
                    continue;
                }

                yield result;
            }
        };

        const generators = [];

        debug('[controller]', 'starting with', this.config.jobs, 'jobs');
        for (let i = 0; i < this.config.jobs; ++i) {
            generators.push(start());
        }

        for await (const result of combineGenerators(generators)) {
            yield result;
        }

        return undefined;
    }

    private handleErrorResult = (error: Error, test: Test): void => {
        if (error.name === 'TimeoutError') {
            const key = `${test.subjectId}_${test.taskId}`;

            this.retryCounter[key] = (this.retryCounter[key] || 0) + 1;

            if (this.retryCounter[key] > this.config.maxTimeoutsInRow) {
                throw error;
            }

            warn(
                `Task ${test.taskId} timed out running component ${test.subjectId}. ${
                    this.config.maxTimeoutsInRow - this.retryCounter[key]
                } retries left in a row.`,
            );
            debug('Original error: ', error);

            this.planner.scheduleRetry(test);

            return;
        }

        throw error;
    };

    private resetTimeoutCounter = (test: Test): void => {
        const key = `${test.subjectId}_${test.taskId}`;

        this.retryCounter[key] = 0;
    };
}
