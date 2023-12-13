import type { InterceptParams } from './intercept';
import type { SetViewportParams } from './viewport';

export const intercept = async (params: InterceptParams): Promise<void> => window._perftool_intercept?.(params);

export const setViewport = async (params: SetViewportParams): Promise<void> => window._perftool_set_viewport?.(params);
