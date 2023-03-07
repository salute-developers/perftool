import assert from '../assert';

describe('utils/assert', () => {
    it('should not throw if truthy condition is passed', () => {
        expect(() => assert(true)).not.toThrow();
        expect(() => assert(5)).not.toThrow();
        expect(() => assert('asd')).not.toThrow();
        expect(() => assert({})).not.toThrow();
    });

    it('should throw if falsy condition is passed', () => {
        expect(() => assert(false)).toThrow();
        expect(() => assert(0)).toThrow();
        expect(() => assert('')).toThrow();
        expect(() => assert(null)).toThrow();
    });
});
