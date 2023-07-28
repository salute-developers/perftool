import { bootstrapTest, createInsertionScriptContent } from '../clientScript';

const test = { subjectId: '3', taskId: 'fake', state: {} };

describe('controller/insertTests', () => {
    afterEach(() => {
        delete window._perftool_test;
    });

    it('should call window._perftool_api_ready if present', () => {
        bootstrapTest(JSON.stringify(test));

        expect(window._perftool_test).toEqual(test);
    });

    it('should parse JSON serialized test and set in window._perftool_test', () => {
        bootstrapTest(JSON.stringify(test));

        expect(window._perftool_test).toEqual(test);
    });
});

describe('controller/createInsertionScriptContent', () => {
    it('should have insertTests body and call with serialized tests', () => {
        const insertionScript = createInsertionScriptContent(test);

        expect(insertionScript.includes(bootstrapTest.toString())).toEqual(true);
        expect(insertionScript.includes(`bootstrapTest('${JSON.stringify(test)}')`)).toEqual(true);
    });
});
