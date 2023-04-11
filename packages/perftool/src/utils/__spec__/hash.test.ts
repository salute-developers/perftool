import getHashCode from '../hash';

describe('utils/hash', () => {
    it('should return hashcode in string representation', () => {
        expect(typeof getHashCode('lkneoiwrjoq')).toEqual('string');
    });

    it('should return same hashcode for equal input', () => {
        const value = 'lkneoiwrjoq';
        expect(getHashCode(value)).toEqual(getHashCode(value));
    });

    it('should return different hashcode for different input', () => {
        expect(getHashCode('lkneoiwrjoq')).not.toEqual(getHashCode('123lkneoiwrjoq'));
    });
});
