import { jest } from '@jest/globals';
import { constants } from 'fs';

import type CheckPathType from '../checkPath';

describe('utils/checkPath', () => {
    let accessMock: jest.Mock;
    let checkPath: typeof CheckPathType;

    beforeEach(async () => {
        jest.unstable_mockModule('fs/promises', () => ({ access: (accessMock = jest.fn(() => Promise.resolve())) }));
        checkPath = (await import('../checkPath')).default;
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
    });

    it('should resolve to false if called with falsy path', () => {
        expect(checkPath()).resolves.toEqual(false);
        expect(checkPath('')).resolves.toEqual(false);
        expect(checkPath('')).resolves.toEqual(false);
    });

    it('should pass path and mode directly to fs access method', async () => {
        const path = '/fake/path';
        const mode = constants.F_OK;

        await checkPath(path, mode);

        expect(accessMock).toBeCalledTimes(1);
        expect(accessMock).toBeCalledWith(path, mode);
    });

    it('should resolve to true if access call resolves', () => {
        expect(checkPath('/fake/path')).resolves.toEqual(true);
        expect(accessMock).toBeCalledTimes(1);
    });

    it('should resolve to false if access call rejects', () => {
        accessMock.mockImplementation(() => {
            return Promise.reject();
        });

        expect(checkPath('/fake/path')).resolves.toEqual(false);
        expect(accessMock).toBeCalledTimes(1);
    });
});
