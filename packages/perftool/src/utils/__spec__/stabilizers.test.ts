import { intersectStabilizers } from '../stabilizers';
import { Config } from '../../config';

describe('utils/intersectStabilizers', () => {
    it('should pass stabilizers from config supported by the task', () => {
        const config = {
            stabilizers: ['fakeStabilizer1', 'fakeStabilizer2', 'fakeStabilizer3'],
        } as Config;
        const taskStabilizers = ['fakeStabilizer1', 'fakeStabilizer4'];

        expect(intersectStabilizers(config, taskStabilizers)).toEqual(['fakeStabilizer1']);
        expect(intersectStabilizers(config)).toEqual([]);
    });
});
