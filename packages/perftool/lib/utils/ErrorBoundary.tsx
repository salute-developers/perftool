import React, { ReactNode, ErrorInfo, Component } from 'react';
import { serializeError } from 'serialize-error';

import BaseError from './baseError';
import { error } from './logger';

type ErrorBoundaryProps = {
    onError: (e: BaseError) => void;
    children: ReactNode;
};

class ErrorBoundary extends Component<ErrorBoundaryProps> {
    componentDidCatch(e: Error, errorInfo: ErrorInfo) {
        this.props.onError(new BaseError(`${e && e.toString()} ${errorInfo.componentStack}`));
    }

    render() {
        return this.props.children;
    }
}

export function withErrorBoundary(element: React.ReactElement): React.ReactElement {
    return <ErrorBoundary onError={onError}>{element}</ErrorBoundary>;
}

export function onError(e: unknown) {
    if (window._perftool_on_error) {
        window._perftool_on_error(serializeError(e));
    } else {
        error(e);
    }
}

export default ErrorBoundary;
