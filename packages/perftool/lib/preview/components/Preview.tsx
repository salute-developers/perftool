import React, { ComponentType } from 'react';

type PreviewProps = {
    Component: ComponentType;
    background: string;
};

function Preview({ Component, background }: PreviewProps) {
    return (
        <div style={{ background }}>
            <Component />
        </div>
    );
}

export default Preview;
