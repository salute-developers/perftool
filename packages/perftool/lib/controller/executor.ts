import puppeteer, { Browser, Page } from 'puppeteer';

import assert from '../utils/assert';
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

export default class Executor<T extends Task<any, any, any>[]> implements IExecutor<T> {
    private readonly config: Config;

    private readonly port: number;

    private readonly browserInstance: Browser;

    private workable = true;

    private readonly stateMap: Map<string, TaskState<T[number]>> = new Map();

    private decorateWithState = (test: Test): RawTest<T[number]> => {
        const key = `${test.taskId}_${test.subjectId}`;

        if (!this.stateMap.has(key)) {
            this.stateMap.set(key, {} as TaskState<T[number]>);
        }

        const state = this.stateMap.get(key)!;

        return {
            ...test,
            state,
        };
    };

    private setState = (result: RunTaskResult<T[number]>): void => {
        const { taskId, subjectId, state } = result;
        const key = `${taskId}_${subjectId}`;

        this.stateMap.set(key, state!);
        result.state = undefined;
    };

    static async create<TT extends Task<any, any>[]>(config: Config, port: number): Promise<Executor<TT>> {
        debug('[executor]', 'launching browser...');

        const browserInstance = await puppeteer.launch({
            headless: true,
            args: ['--js-flags="--maglev=false --max_opt=0"', '--no-sandbox'],
            ...config.puppeteerOptions,
        });
        debug('[executor]', 'launched browser successfully');

        return new Executor<TT>(config, port, browserInstance);
    }

    private constructor(config: Config, port: number, browserInstance: Browser) {
        this.config = config;
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
        let page: Page;

        try {
            page = await this.browserInstance.newPage();
        } catch (e) {
            debug('[executor]', 'Mystery puppeteer error, retrying', e);
            page = await this.browserInstance.newPage();
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
