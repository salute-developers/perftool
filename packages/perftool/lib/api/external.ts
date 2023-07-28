import type { InterceptParams } from './intercept';

export const intercept = async (params: InterceptParams): Promise<void> => window._perftool_intercept?.(params);
