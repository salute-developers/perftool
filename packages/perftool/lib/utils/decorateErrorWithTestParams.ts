type Params = {
    subjectId: string;
};

function decorateErrorWithTestParams(error: Error, { subjectId }: Params): Error {
    error.stack = `${error.stack}\n    at ${subjectId}`;

    return error;
}

export default decorateErrorWithTestParams;
