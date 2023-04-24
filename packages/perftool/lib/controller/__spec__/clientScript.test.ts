import { insertTests, createInsertionScriptContent } from '../clientScript';

const tests = [
    { subjectId: '1', taskId: '1', state: {} },
    { subjectId: '3', taskId: 'fake', state: {} },
];

describe('controller/insertTests', () => {
    afterEach(() => {
        delete window.tests;
    });

    it('should parse JSON serialized tests and push in window.tests if present', () => {
        window.tests = [];

        insertTests(JSON.stringify(tests));

        expect(window.tests).toEqual(tests);
    });

    it('should parse JSON serialized tests and push in window.tests if not present', () => {
        insertTests(JSON.stringify(tests));

        expect(window.tests).toEqual(tests);
    });
});

describe('controller/createInsertionScriptContent', () => {
    it('should have insertTests body and call with serialized tests', () => {
        const insertionScript = createInsertionScriptContent(tests);

        expect(insertionScript.includes(insertTests.toString())).toEqual(true);
        expect(insertionScript.includes(`insertTests('${JSON.stringify(tests)}')`)).toEqual(true);
    });
});
