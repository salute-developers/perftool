import React, { ReactNode, ErrorInfo, Component } from 'react';
import { serializeError } from 'serialize-error';

import BaseError from './baseError';

type ErrorBoundaryProps = {
    onError: (error: BaseError) => void;
    children: ReactNode;
};

class ErrorBoundary extends Component<ErrorBoundaryProps> {
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.props.onError(new BaseError(`${error && error.toString()} ${errorInfo.componentStack}`));
    }

    render() {
        return this.props.children;
    }
}

export function withErrorBoundary(element: React.ReactElement): React.ReactElement {
    return <ErrorBoundary onError={onError}>{element}</ErrorBoundary>;
}

export function onError(error: unknown) {
    window._perftool_on_error?.(serializeError(error));
}

export default ErrorBoundary;
