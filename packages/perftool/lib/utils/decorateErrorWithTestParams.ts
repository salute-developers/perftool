type Params = {
    subjectId: string;
    isBaseline?: boolean;
};

function decorateErrorWithTestParams(error: Error, { subjectId, isBaseline }: Params): Error {
    error.stack = [error.stack, subjectId, isBaseline ? 'baseline project' : 'current project'].join('\n    at ');

    return error;
}

export default decorateErrorWithTestParams;
