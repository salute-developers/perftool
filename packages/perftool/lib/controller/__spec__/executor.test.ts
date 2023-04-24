import { jest } from '@jest/globals';

import { Config } from '../../config';
import type { Test } from '../executor';

describe('controller/Executor', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
    });

    it('should create Executor instance with factory', async () => {
        let launchMock = {} as jest.Mock;
        jest.unstable_mockModule('puppeteer', () => ({
            default: {
                launch: (launchMock = jest.fn(async () => {})),
            },
        }));

        const { default: Executor } = await import('../executor');

        const port = Math.trunc(Math.random() * 2 ** 16);
        const config = {
            puppeteerOptions: {
                waitForInitialPage: true,
                devtools: true,
            },
        } as Config;

        const executor = await Executor.create(config, port);

        expect(executor).toBeInstanceOf(Executor);
        expect(launchMock).toHaveBeenCalledTimes(1);
        expect(launchMock.mock.calls[0]).toMatchSnapshot();
    });

    it('should open page in browser and return result from client runner', async () => {
        let newPageMock = {} as jest.Mock;
        let gotoMock = {} as jest.Mock;
        let exposeFunctionMock = {} as jest.Mock<any>;
        let addScriptTagMock = {} as jest.Mock;
        let closeMock = {} as jest.Mock;
        let createInsertionScriptContentMock = {} as jest.Mock;
        const tests: Test[] = [{ subjectId: 'fakeId3', taskId: 'fakeTask3', type: 'dry' }];
        const result = [{ ...tests[0], state: {} }];
        const insertionScriptContent = 'some script content';
        jest.unstable_mockModule('puppeteer', () => ({
            default: {
                launch: async () => ({
                    newPage: (newPageMock = jest.fn(async () => ({
                        goto: (gotoMock = jest.fn()),
                        exposeFunction: (exposeFunctionMock = jest.fn((_: any, callback: (r: any) => void) => {
                            callback(result);
                        })),
                        addScriptTag: (addScriptTagMock = jest.fn()),
                        close: (closeMock = jest.fn()),
                    }))),
                }),
            },
        }));
        jest.unstable_mockModule('../clientScript', () => ({
            createInsertionScriptContent: (createInsertionScriptContentMock = jest.fn(() => insertionScriptContent)),
        }));

        const { default: Executor } = await import('../executor');

        const port = Math.trunc(Math.random() * 2 ** 16);
        const config = {
            puppeteerOptions: {},
            runWaitTimeout: 1000,
        } as Config;

        const executor = await Executor.create(config, port);
        const execResult = await executor.execute(tests);

        expect(newPageMock).toHaveBeenCalledTimes(1);

        expect(gotoMock).toHaveBeenCalledTimes(1);
        expect(gotoMock).toHaveBeenCalledWith(`http://localhost:${port}/`);

        expect(exposeFunctionMock).toHaveBeenCalledTimes(1);
        expect(exposeFunctionMock.mock.calls[0][0]).toEqual('finish');

        expect(addScriptTagMock).toHaveBeenCalledTimes(1);
        expect(addScriptTagMock).toHaveBeenCalledWith({ content: insertionScriptContent });

        expect(createInsertionScriptContentMock).toHaveBeenCalledTimes(1);
        expect(createInsertionScriptContentMock).toHaveBeenCalledWith([{ ...tests[0], state: {} }]);

        expect(closeMock).toHaveBeenCalledTimes(1);

        expect(execResult).toEqual(result);

        result[0].state = { changedState: true };

        await executor.execute(tests);

        expect(createInsertionScriptContentMock).toHaveBeenLastCalledWith([
            { ...tests[0], state: { changedState: true } },
        ]);
    });

    it('should return error on page timeout', async () => {
        let closeMock = {} as jest.Mock;
        jest.unstable_mockModule('puppeteer', () => ({
            default: {
                launch: async () => ({
                    newPage: jest.fn(async () => ({
                        goto: jest.fn(),
                        exposeFunction: jest.fn(),
                        addScriptTag: jest.fn(),
                        close: (closeMock = jest.fn()),
                    })),
                }),
            },
        }));
        jest.unstable_mockModule('../clientScript', () => ({
            createInsertionScriptContent: jest.fn(),
        }));

        const { default: Executor } = await import('../executor');

        const port = Math.trunc(Math.random() * 2 ** 16);
        const config = {
            puppeteerOptions: {},
            runWaitTimeout: 0,
        } as Config;

        const executor = await Executor.create(config, port);
        const execResult = await executor.execute([]);

        expect(closeMock).toHaveBeenCalledTimes(1);
        expect(execResult).toBeInstanceOf(Error);
    });

    it('should throw if execute called after finalize', async () => {
        let newPageMock = {} as jest.Mock;
        let closeMock = {} as jest.Mock;
        jest.unstable_mockModule('puppeteer', () => ({
            default: {
                launch: async () => ({
                    newPage: (newPageMock = jest.fn()),
                    close: (closeMock = jest.fn()),
                }),
            },
        }));

        const { default: Executor } = await import('../executor');

        const port = Math.trunc(Math.random() * 2 ** 16);
        const config = {
            puppeteerOptions: {},
        } as Config;

        const executor = await Executor.create(config, port);

        await executor.finalize();
        expect(closeMock).toHaveBeenCalledTimes(1);

        expect(executor.execute([])).rejects.toThrow();
        expect(newPageMock).toHaveBeenCalledTimes(0);

        await executor.finalize();
        expect(closeMock).toHaveBeenCalledTimes(1);
    });
});
