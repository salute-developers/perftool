import { jest } from '@jest/globals';
import { constants } from 'fs';

let accessMock: jest.Mock;
jest.unstable_mockModule('fs/promises', () => ({ access: (accessMock = jest.fn()) }));

const { default: checkPath } = await import('../checkPath');
const { access } = await import('fs/promises');

describe('utils/checkPath', () => {
    beforeEach(() => {
        accessMock.mockImplementation(() => {
            return Promise.resolve();
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
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

        expect(access).toBeCalledTimes(1);
        expect(access).toBeCalledWith(path, mode);
    });

    it('should resolve to true if access call resolves', () => {
        expect(checkPath('/fake/path')).resolves.toEqual(true);
        expect(access).toBeCalledTimes(1);
    });

    it('should resolve to false if access call rejects', () => {
        accessMock.mockImplementation(() => {
            return Promise.reject();
        });

        expect(checkPath('/fake/path')).resolves.toEqual(false);
        expect(access).toBeCalledTimes(1);
    });
});
