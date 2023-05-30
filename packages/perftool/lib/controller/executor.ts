import puppeteer, { Browser, Page } from 'puppeteer';

import assert from '../utils/assert';
import Cache from '../cache';
import { Config } from '../config';
import Deferred, { defer } from '../utils/deferred';
import { RunTaskResult } from '../client/measurement/runner';
import { Task, TaskState } from '../client/measurement/types';
import { debug } from '../utils/logger';
import { RawTest } from '../client/input';

import { createInsertionScriptContent } from './clientScript';

export type Test = { taskId: string; subjectId: string; type?: 'dry' };

export type IExecutor<T extends Task<any, any>[]> = {
    execute(tests: Test[]): Promise<RunTaskResult<T[number]>[] | Error>;
};

const PUPPETEER_MYSTERY_ERROR_RETRIES = 5;

export default class Executor<T extends Task<any, any, any>[]> implements IExecutor<T> {
    private readonly cache: Cache;

    private readonly config: Config;

    private readonly port: number;

    private readonly browserInstance: Browser;

    private workable = true;

    private readonly stateMap: Map<string, TaskState<T[number]>> = new Map();

    private getStateKey(taskId: string, subjectId: string) {
        return `${taskId}_${subjectId}`;
    }

    private decorateWithState = (test: Test): RawTest<T[number]> => {
        const key = this.getStateKey(test.taskId, test.subjectId);

        if (!this.stateMap.has(key)) {
            const cachedState = this.cache.getTaskState(test.subjectId, test.taskId);

            this.stateMap.set(key, (cachedState || {}) as TaskState<T[number]>);
        }

        const state = this.stateMap.get(key)!;

        return {
            ...test,
            state,
        };
    };

    private setState = (result: RunTaskResult<T[number]>): void => {
        const { taskId, subjectId, state } = result;
        const key = this.getStateKey(taskId, subjectId);

        this.stateMap.set(key, state!);
        this.cache.setTaskState(subjectId, taskId, state!);
        result.state = undefined;
    };

    static async create<TT extends Task<any, any>[]>(
        config: Config,
        cache: Cache,
        port: number,
    ): Promise<Executor<TT>> {
        debug('[executor]', 'launching browser...');

        const browserInstance = await puppeteer.launch({
            headless: true,
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

    async execute(tests: Test[]): Promise<RunTaskResult<T[number]>[] | Error> {
        debug('[executor]', 'running tests', tests);
        assert(this.workable);
        let page: Page = undefined as unknown as Page;

        for (let retry = 0; !page && retry < PUPPETEER_MYSTERY_ERROR_RETRIES; ++retry) {
            try {
                page = await this.browserInstance.newPage();
            } catch (e) {
                debug('[executor]', 'Mystery puppeteer error, retrying', e);

                if (retry + 1 === PUPPETEER_MYSTERY_ERROR_RETRIES) {
                    page = await this.browserInstance.newPage();
                }
            }
        }

        const results = new Deferred<RunTaskResult<T[number]>[]>();

        await page.goto(`http://localhost:${this.port}/`);
        await page.exposeFunction('finish', (taskResults: RunTaskResult<T[number]>[]) => {
            taskResults.forEach(this.setState);

            results.resolve(taskResults);
        });
        await page.addScriptTag({ content: createInsertionScriptContent(tests.map(this.decorateWithState)) });

        return Promise.race([
            results.promise,
            defer(this.config.runWaitTimeout).then(() => {
                return new Error(`timeout ${this.config.runWaitTimeout}ms reached waiting for run to end`);
            }),
        ]).finally(() => {
            return page.close();
        });
    }
}
