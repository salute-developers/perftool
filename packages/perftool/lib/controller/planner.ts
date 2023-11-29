import { debug } from '../utils/logger';
import { id as staticTaskSubjectId } from '../stabilizers/staticTask';
import { intersectStabilizers } from '../utils/stabilizers';
import type { Task } from '../client/measurement/types';
import type { Config } from '../config';
import type { TestModule } from '../build/collect';

import type { Test } from './executor';

export type IPlanner = {
    plan(): Generator<Test, undefined>;
    scheduleRetry(test: Test): void;
};

export function getTests<T extends Task<any, any>[]>(
    config: Config,
    tasks: T[number][],
    modules: TestModule[],
): Test[] {
    const testGroups = tasks.map(({ id: taskId, availableStabilizers }) => {
        const testGroup: Test[][] = modules.map((module) =>
            module.subjects.map(({ id: subjectId }) => ({ taskId, subjectId })),
        );

        if (testGroup.length && intersectStabilizers(config, availableStabilizers).includes(staticTaskSubjectId)) {
            testGroup.push([{ taskId, subjectId: staticTaskSubjectId }]);
        }

        return testGroup;
    });

    return testGroups.flat(2);
}

export default class Planner<T extends Task<any, any>[]> implements IPlanner {
    private readonly config: Config;

    private readonly tasks: T;

    private readonly testModules: TestModule[];

    private readonly additionalRuns: Test[] = [];

    constructor(config: Config, tasks: T, testModules: TestModule[]) {
        this.config = config;
        this.tasks = tasks;
        this.testModules = testModules;
    }

    *plan(): Generator<Test, undefined> {
        const idempotentTasks = this.tasks.filter(({ isIdempotent }) => isIdempotent);
        const nonIdempotentTasks = this.tasks.filter(({ isIdempotent }) => !isIdempotent);

        if (idempotentTasks.length) {
            debug('[planner]', 'running idempotent tasks');
            const tests = getTests(this.config, idempotentTasks, this.testModules);

            for (const test of tests) {
                yield test;
            }
        }

        if (nonIdempotentTasks.length) {
            debug('[planner]', 'running non-idempotent (repetitive) tasks');
            const tests = getTests(this.config, nonIdempotentTasks, this.testModules);

            if (this.config.dryRunTimes) {
                debug('[planner]', 'dry-running', this.config.dryRunTimes, 'times');
            } else {
                debug('[planner]', 'dry-running is skipped');
            }
            for (let i = 0; i < this.config.dryRunTimes; ++i) {
                for (const test of tests) {
                    yield { ...test, type: 'dry' };
                }
            }

            debug('[planner]', 'running tests', this.config.retries, 'repetitions');

            for (let i = 0; i < this.config.retries; ++i) {
                for (const test of tests) {
                    yield test;
                }
            }
        }

        if (this.additionalRuns.length) {
            debug('[planner]', 'running extra times');

            for (const test of this.additionalRuns) {
                yield test;
            }
        }

        return undefined;
    }

    scheduleRetry(test: Test): void {
        this.additionalRuns.push(test);
    }
}
