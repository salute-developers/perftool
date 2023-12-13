import puppeteer, { Browser } from 'puppeteer';
import { deserializeError, ErrorObject } from 'serialize-error';

import assert from '../utils/assert';
import Cache from '../cache';
import { Config } from '../config';
import Deferred, { defer } from '../utils/deferred';
import { RunTaskResult } from '../client/measurement/runner';
import { Task, TaskState } from '../client/measurement/types';
import { debug } from '../utils/logger';
import { RawTest } from '../client/input';
import { useInterceptApi } from '../api/intercept';
import { createNewPage } from '../utils/puppeteer';
import { useViewportApi, ViewportState } from '../api/viewport';
import decorateErrorWithTestParams from '../utils/decorateErrorWithTestParams';

import { bootstrapTest } from './clientScript';

export type Test = { taskId: string; subjectId: string; type?: 'dry' };

export type ComponentState = ViewportState;

export type IExecutor<T extends Task<any, any>[]> = {
    execute(test: Test): Promise<RunTaskResult<T[number]> | Error>;
};

export default class Executor<T extends Task<any, any, any>[]> implements IExecutor<T> {
    private readonly cache: Cache;

    private readonly config: Config;

    private readonly port: number;

    private readonly browserInstance: Browser;

    private workable = true;

    private readonly taskStateMap: Map<string, TaskState<T[number]>> = new Map();

    private readonly componentStateMap: Map<string, ComponentState> = new Map();

    private getComponentState(subjectId: string): ComponentState {
        if (!this.componentStateMap.has(subjectId)) {
            this.componentStateMap.set(subjectId, {});
        }

        return this.componentStateMap.get(subjectId)!;
    }

    private getTaskStateKey(taskId: string, subjectId: string) {
        return `${taskId}_${subjectId}`;
    }

    private decorateWithTaskState = (test: Test): RawTest<T[number]> => {
        const key = this.getTaskStateKey(test.taskId, test.subjectId);

        if (!this.taskStateMap.has(key)) {
            const cachedState = this.cache.getTaskState(test.subjectId, test.taskId);
            let state = {} as TaskState<T[number]>;

            if (cachedState) {
                state = {
                    ...(cachedState as TaskState<T[number]>),
                    cached: true,
                };
            }

            this.taskStateMap.set(key, state);
        }

        const state = this.taskStateMap.get(key)!;

        return {
            ...test,
            state,
        };
    };

    private setTaskState = (result: RunTaskResult<T[number]>): void => {
        const { taskId, subjectId, state } = result;
        const key = this.getTaskStateKey(taskId, subjectId);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { cached: _, ...filteredState } = state || ({} as TaskState<T[number]>);
        this.taskStateMap.set(key, filteredState as TaskState<T[number]>);
        this.cache.setTaskState(subjectId, taskId, filteredState);
        result.state = undefined;
    };

    static async create<TT extends Task<any, any>[]>(
        config: Config,
        cache: Cache,
        port: number,
    ): Promise<Executor<TT>> {
        debug('[executor]', 'launching browser...');

        const browserInstance = await puppeteer.launch({
            headless: 'new',
            args: ['--js-flags="--maglev=false --max_opt=0"', '--no-sandbox'],
            ...config.puppeteerOptions,
        });
        debug('[executor]', 'launched browser successfully');

        return new Executor<TT>(config, cache, port, browserInstance);
    }

    private constructor(config: Config, cache: Cache, port: number, browserInstance: Browser) {
        this.config = config;
        this.cache = cache;
        this.port = port;
        this.browserInstance = browserInstance;
    }

    async finalize() {
        if (!this.workable) {
            return;
        }

        debug('[executor]', 'exiting browser');

        this.workable = false;

        await this.browserInstance.close();
    }

    async execute(test: Test): Promise<RunTaskResult<T[number]> | Error> {
        debug('[executor]', 'running test', test);
        assert(this.workable);

        const page = await createNewPage(this.browserInstance);
        const result = new Deferred<RunTaskResult<T[number]> | Error>();
        const componentState = this.getComponentState(test.subjectId);
        const decoratedTest = this.decorateWithTaskState(test);

        await page.exposeFunction('_perftool_finish', (taskResult: RunTaskResult<T[number]>) => {
            this.setTaskState(taskResult);

            result.resolve(taskResult);
        });
        await page.exposeFunction('_perftool_on_error', (rawError: ErrorObject) => {
            const error = deserializeError(rawError);

            result.resolve(decorateErrorWithTestParams(error, { subjectId: test.subjectId }));
        });
        await useInterceptApi(page);
        await useViewportApi(page, componentState, async () => {
            await bootstrapTest(page, decoratedTest);
        });

        await page.goto(`http://localhost:${this.port}/`);

        await bootstrapTest(page, decoratedTest);

        return Promise.race([
            result.promise,
            defer(
                this.config.runWaitTimeout,
                () => new Error(`timeout ${this.config.runWaitTimeout}ms reached waiting for run to end`),
            ),
        ]).finally(() => {
            return page.close();
        });
    }
}
