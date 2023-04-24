import { formatImportExpression, formatLines } from '../codegen';

describe('utils/formatLines', () => {
    it('should always return a string', () => {
        expect(typeof formatLines([])).toEqual('string');
        expect(typeof formatLines(['asd', '124'])).toBe('string');
    });

    it('should return a string which has occurrences of input strings', () => {
        const input = ['fakeline1', 'fakeline2'];
        const result = formatLines(input);

        expect(result.includes(input[0])).toEqual(true);
        expect(result.includes(input[1])).toEqual(true);
    });

    it('should return a string representing joined input strings with carriage return in between', () => {
        const input = ['fakeline1', 'fakeline2', 'asdfaq1', 'sdgwe3'];

        expect(formatLines(input)).toEqual(input.join('\r\n'));
    });
});

describe('utils/formatImportExpression', () => {
    it('should always return a string', () => {
        expect(typeof formatImportExpression('fake/path', { defaultImportIdentity: 'fakeId' })).toBe('string');
        expect(typeof formatImportExpression('fake/path', { namedImports: [] })).toBe('string');
        expect(typeof formatImportExpression('fake/path', { namedImports: ['fakeNamed'] })).toBe('string');
        expect(
            typeof formatImportExpression('fake/path', {
                defaultImportIdentity: 'fakeId',
                namedImports: ['fakeNamed1', { original: 'fakeNamed2', alias: 'aliasedNamed2' }],
            }),
        ).toBe('string');
    });

    it('should return a string which has occurrences of input params', () => {
        const modulePath = 'fake/path';
        const defaultImportIdentity = 'fakeId';
        const namedImports = ['fakeNamed1', { original: 'fakeNamed2', alias: 'aliasedNamed2' }] as const;

        const result = formatImportExpression(modulePath, { defaultImportIdentity, namedImports });

        expect(result.includes(modulePath)).toEqual(true);
        expect(result.includes(defaultImportIdentity)).toEqual(true);
        expect(result.includes(namedImports[0])).toEqual(true);
        expect(result.includes(namedImports[1].original)).toEqual(true);
        expect(result.includes(namedImports[1].alias)).toEqual(true);
    });

    it('should return a string matching import syntax', () => {
        const importPattern =
            /import(?:(?:(?:[ \n\t]+([^ *\n\t{},]+)[ \n\t]*(?:,|[ \n\t]+))?([ \n\t]*\{(?:[ \n\t]*[^ \n\t"'{}]+[ \n\t]*,?)+\})?[ \n\t]*)|[ \n\t]*\*[ \n\t]*as[ \n\t]+([^ \n\t{}]+)[ \n\t]+)from[ \n\t]*(?:['"])([^'"\n]+)(['"])/;

        expect(formatImportExpression('fake/path', { defaultImportIdentity: 'fakeId' })).toMatch(importPattern);
        expect(formatImportExpression('fake/path', { namedImports: ['fakeNamed'] })).toMatch(importPattern);
        expect(
            formatImportExpression('fake/path', {
                defaultImportIdentity: 'fakeId',
                namedImports: ['fakeNamed1', { original: 'fakeNamed2', alias: 'aliasedNamed2' }],
            }),
        ).toMatch(importPattern);
    });
});
