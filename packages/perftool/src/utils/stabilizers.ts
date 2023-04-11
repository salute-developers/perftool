import type { Config } from '../config/common';

export function intersectStabilizers(config: Config, taskAvailableStabilizers?: string[]): string[] {
    const configStabilizers = config.stabilizers;

    return configStabilizers.filter((stabilizer) => (taskAvailableStabilizers || []).includes(stabilizer));
}
