type LogLevel = 'quiet' | 'normal' | 'verbose';

type ProcessCliLogLevelParams = {
    verbose?: boolean;
    quiet?: boolean;
    logLevel?: LogLevel;
};

export function processCliLogLevel({ verbose, quiet, logLevel }: ProcessCliLogLevelParams): LogLevel {
    if (verbose || logLevel === 'verbose') {
        return 'verbose';
    }

    if (quiet || logLevel === 'quiet') {
        return 'quiet';
    }

    return 'normal';
}
