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
    baselineTestModules: TestModule[] | null,
): Test[] {
    const baselineSubjectIdsSet = new Set(
        baselineTestModules ? baselineTestModules.map((module) => module.subjects.map(({ id }) => id)).flat() : [],
    );
    const testGroups = tasks.map(({ id: taskId, availableStabilizers }) => {
        const testGroup: Test[][] = modules.map((module) =>
            module.subjects.reduce((acc, { id: subjectId }) => {
                acc.push({ taskId, subjectId });

                if (baselineSubjectIdsSet.has(subjectId)) {
                    acc.push({ taskId, subjectId, isBaseline: true });
                }

                return acc;
            }, [] as Test[]),
        );

        if (testGroup.length && intersectStabilizers(config, availableStabilizers).includes(staticTaskSubjectId)) {
            testGroup.push([{ taskId, subjectId: staticTaskSubjectId }]);

            if (baselineTestModules) {
                testGroup.push([{ taskId, subjectId: staticTaskSubjectId, isBaseline: true }]);
            }
        }

        return testGroup;
    });

    return testGroups.flat(2);
}

export default class Planner<T extends Task<any, any>[]> implements IPlanner {
    private readonly config: Config;

    private readonly tasks: T;

    private readonly testModules: TestModule[];

    private readonly baselineTestModules: TestModule[] | null;

    private readonly additionalRuns: Test[] = [];

    constructor(config: Config, tasks: T, testModules: TestModule[], baselineTestModules: TestModule[] | null) {
        this.config = config;
        this.tasks = tasks;
        this.testModules = testModules;
        this.baselineTestModules = baselineTestModules || null;
    }

    *plan(): Generator<Test, undefined> {
        const idempotentTasks = this.tasks.filter(({ isIdempotent }) => isIdempotent);
        const nonIdempotentTasks = this.tasks.filter(({ isIdempotent }) => !isIdempotent);

        if (idempotentTasks.length) {
            debug('[planner]', 'running idempotent tasks');
            const tests = getTests(this.config, idempotentTasks, this.testModules, this.baselineTestModules);

            for (const test of tests) {
                yield test;
            }
        }

        if (nonIdempotentTasks.length) {
            debug('[planner]', 'running non-idempotent (repetitive) tasks');
            const tests = getTests(this.config, nonIdempotentTasks, this.testModules, this.baselineTestModules);

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
