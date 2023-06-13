import React, { ComponentType, CSSProperties } from 'react';

type PreviewProps = {
    Component: ComponentType;
    background: string;
    style: CSSProperties;
};

function Preview({ style, Component, background }: PreviewProps) {
    return (
        <div style={{ ...style, background }}>
            <Component />
        </div>
    );
}

export default Preview;
