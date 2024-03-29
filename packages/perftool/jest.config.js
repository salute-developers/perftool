export default {
    roots: ['<rootDir>/lib'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.jest.json',
                useESM: true,
            },
        ],
    },
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    testEnvironment: 'jsdom',
    testMatch: ['**/__spec__/**/*.test.{j,t}s?(x)'],
};
