import Ajv from 'ajv';

import degradation from './test-result/degradation.json';
import unchanged from './test-result/unchanged.json';

const valueWithErrorTuple = {
    type: 'array',
    minItems: 2,
    maxItems: 2,
    items: { type: 'number' }, // TODO: minimum: 0, разобраться с отрицательным результатом в rerender
};

const metricComparisonSchema = {
    type: 'object',
    properties: {
        old: valueWithErrorTuple,
        new: valueWithErrorTuple,
        change: {
            type: 'object',
            properties: {
                difference: { type: 'number' },
                percentage: { type: 'number' },
                significanceRank: { enum: ['low', 'medium', 'high'] },
            },
            required: ['difference', 'percentage', 'significanceRank'],
        },
    },
    required: ['old', 'new', 'change'],
};

const taskComparisonSchema = {
    type: 'object',
    properties: {
        __comparable: { type: 'boolean' },
        mean: metricComparisonSchema,
        median: metricComparisonSchema,
    },
    required: ['__comparable', 'mean', 'median'],
};

const subjectComparisonSchema = {
    type: 'object',
    properties: {
        render: taskComparisonSchema,
        rerender: taskComparisonSchema,
    },
    required: ['render', 'rerender'],
};

const resultSchema = {
    type: 'object',
    patternProperties: {
        '^.+#.+$': subjectComparisonSchema,
    },
};

const topSchema = {
    type: 'object',
    properties: {
        version: { type: 'string' },
        isVersionChanged: { type: 'boolean' },
        timestamp: { type: 'integer' },
        staticTaskChange: subjectComparisonSchema,
        hasSignificantNegativeChanges: { type: 'boolean' },
        stabilizers: { type: 'array', items: { type: 'string' } },
        result: resultSchema,
    },
    required: ['staticTaskChange', 'hasSignificantNegativeChanges', 'stabilizers', 'result'],
};

const ajv = new Ajv();
const validate = ajv.compile(topSchema);

describe('e2e/unchanged', () => {
    it('should have no negative changes', () => {
        expect(unchanged.hasSignificantNegativeChanges).toEqual(false);
    });

    it('should match schema', () => {
        const result = validate(unchanged);

        if (!result) {
            throw new Error(ajv.errorsText(validate.errors));
        }

        expect(validate(unchanged)).toEqual(true);
    });
});

describe('e2e/degradation', () => {
    it('should have negative changes', () => {
        expect(degradation.hasSignificantNegativeChanges).toEqual(true);
    });

    it('should match schema', () => {
        const result = validate(degradation);

        if (!result) {
            throw new Error(ajv.errorsText(validate.errors));
        }

        expect(validate(degradation)).toEqual(true);
    });
});
