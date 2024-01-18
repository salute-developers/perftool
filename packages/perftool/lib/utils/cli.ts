import { PerftoolMode } from '../config/common';

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

type ProcessModeParams = {
    preview: boolean;
    baselineRefDir: string;
};

export function processPerftoolMode({ preview, baselineRefDir }: ProcessModeParams): PerftoolMode {
    const isChild = Boolean(process.env.PERFTOOL_CHILD_MODE);
    const isCollaborative = Boolean(baselineRefDir);

    switch (true) {
        case isChild:
            return 'child';
        case preview:
            return 'preview';
        case isCollaborative:
            return 'collaborative';
        default:
    }

    return 'normal';
}
