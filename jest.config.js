export default {
    roots: ['<rootDir>/src'],
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
    moduleNameMapper: {
        '^react(.*)$': '<rootDir>/node_modules/react$1',
    },
};
