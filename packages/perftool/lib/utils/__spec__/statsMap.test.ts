import { isStatsMap } from '../statsMap';

describe('utils/isStatsMap', () => {
    it('should check if object is statsMap', () => {
        const statsMap = {
            __statsMap: true,
        };

        expect(isStatsMap(statsMap)).toEqual(true);
        expect(isStatsMap({})).toEqual(false);
        expect(isStatsMap(null)).toEqual(false);
        expect(isStatsMap('kek')).toEqual(false);
    });
});
