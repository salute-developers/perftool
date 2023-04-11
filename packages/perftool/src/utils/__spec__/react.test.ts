import { jest } from '@jest/globals';
import type React from 'react';

const originalRequire = global.require;

describe('utils/react/isReact18AndNewer', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
    });

    it('should return false if react version is under 18', async () => {
        jest.unstable_mockModule('react', () => ({ version: '17.3.0' }));
        const { isReact18AndNewer } = await import('../react');

        expect(isReact18AndNewer()).toEqual(false);
    });

    it('should return true if react version is 18 and higher', async () => {
        jest.unstable_mockModule('react', () => ({ version: '18.2.0' }));
        const { isReact18AndNewer } = await import('../react');

        expect(isReact18AndNewer()).toEqual(true);
    });
});

describe('utils/render', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
        process.env.PERFTOOL_CLIENT_RUNTIME = undefined;
        global.require = originalRequire;
    });

    it('should call ReactDOM.render if react version is under 18', async () => {
        let renderMock = {} as jest.Mock;
        let res = () => undefined;

        jest.unstable_mockModule('react', () => ({ version: '17.3.0' }));
        jest.unstable_mockModule('react-dom', () => ({
            default: { render: (renderMock = jest.fn((_, __, resolve: any) => (res = resolve)())) },
        }));

        const { render } = await import('../react');
        const fakeElement = {} as React.ReactElement;
        const fakeContainer = {} as HTMLElement;

        await render(fakeElement, fakeContainer);

        expect(renderMock).toHaveBeenCalledTimes(1);
        expect(renderMock).toHaveBeenCalledWith(fakeElement, fakeContainer, res);
    });

    it('should call ReactDOMClient.createRoot if react version is 18 and higher', async () => {
        let createRootMock = {} as jest.Mock;
        let rootRenderMock = {} as jest.Mock;
        jest.unstable_mockModule('react', () => ({ version: '18.2.0' }));
        process.env.PERFTOOL_CLIENT_RUNTIME = '1';

        const modifiedRequire = () => undefined;
        modifiedRequire.context = jest.fn(() => () => ({
            createRoot: (createRootMock = jest.fn(() => ({ render: (rootRenderMock = jest.fn()) }))),
        }));
        global.require = modifiedRequire as any;

        const { render } = await import('../react');
        const fakeElement = {} as React.ReactElement;
        const fakeContainer = {} as HTMLElement;

        await render(fakeElement, fakeContainer);

        expect(createRootMock).toHaveBeenCalledTimes(1);
        expect(rootRenderMock).toHaveBeenCalledTimes(1);
        expect(createRootMock).toHaveBeenCalledWith(fakeContainer);
        expect(rootRenderMock).toHaveBeenCalledWith(fakeElement);
    });
});

describe('utils/hydrate', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
        process.env.PERFTOOL_CLIENT_RUNTIME = undefined;
        global.require = originalRequire;
    });

    it('should call ReactDOM.hydrate if react version is under 18', async () => {
        let hydrateMock = {} as jest.Mock;
        let res = () => undefined;
        jest.unstable_mockModule('react', () => ({ version: '17.3.0' }));
        jest.unstable_mockModule('react-dom', () => ({
            default: { hydrate: (hydrateMock = jest.fn((_, __, resolve: any) => (res = resolve)())) },
        }));

        const { hydrate } = await import('../react');
        const fakeElement = {} as React.ReactElement;
        const fakeContainer = {} as HTMLElement;

        await hydrate(fakeElement, fakeContainer);

        expect(hydrateMock).toHaveBeenCalledTimes(1);
        expect(hydrateMock).toHaveBeenCalledWith(fakeElement, fakeContainer, res);
    });

    it('should call ReactDOMClient.hydrateRoot if react version is 18 and higher', async () => {
        let hydrateRootMock = {} as jest.Mock;
        jest.unstable_mockModule('react', () => ({ version: '18.2.0' }));
        process.env.PERFTOOL_CLIENT_RUNTIME = '1';

        const modifiedRequire = () => undefined;
        modifiedRequire.context = jest.fn(() => () => ({
            hydrateRoot: (hydrateRootMock = jest.fn()),
        }));
        global.require = modifiedRequire as any;

        const { hydrate } = await import('../react');
        const fakeElement = {} as React.ReactElement;
        const fakeContainer = {} as HTMLElement;

        await hydrate(fakeElement, fakeContainer);

        expect(hydrateRootMock).toHaveBeenCalledTimes(1);
        expect(hydrateRootMock).toHaveBeenCalledWith(fakeContainer, fakeElement);
    });
});
