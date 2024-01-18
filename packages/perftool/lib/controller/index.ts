import { Config } from '../config';
import { Task } from '../client/measurement/types';
import { RunTaskResult } from '../client/measurement/runner';
import { TestModule } from '../build/collect';
import { info } from '../utils/logger';
import Cache from '../cache';

import Executor from './executor';
import Planner from './planner';
import TestController from './controller';

type RunTestsParams<T extends Task<any, any>[]> = {
    cache: Cache;
    config: Config;
    port: number;
    tasks: T;
    testModules: TestModule[];
    baselinePort?: number;
    baselineTestModules?: TestModule[];
};

export async function* runTests<T extends Task<any, any>[]>({
    cache,
    config,
    port,
    tasks,
    testModules,
    baselinePort,
    baselineTestModules,
}: RunTestsParams<T>): AsyncGenerator<RunTaskResult<T[number]>, undefined> {
    info('Running performance tests...');

    const planner = new Planner(config, tasks, testModules, baselineTestModules || null);
    const executor = await Executor.create<T>(
        config,
        cache,
        port,
        typeof baselinePort === 'number' ? baselinePort : null,
    );
    const controller = new TestController<T>(config, planner, executor);

    const results = controller.run();

    for await (const result of results) {
        yield result;
    }

    await executor.finalize();

    return undefined;
}
