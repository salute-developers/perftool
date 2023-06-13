import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const Root = styled.div`
    display: flex;
    flex-direction: column;
    background: red;
    height: 100%;
`;

const Node = styled.div`
    display: flex;
    background: green;
    margin: 5px;
    height: 100%;
`;

type Props = {
    slow?: boolean;
};

export function TestComponent({ slow }: Props) {
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!slow) {
            return;
        }

        for (const child of rootRef.current?.children || []) {
            child.getBoundingClientRect();
        }
    }, [slow]);

    const length = slow ? 1000 : 10;

    return (
        <Root ref={rootRef}>
            {[...Array(length)].map((_, i) => (
                <Node key={i} />
            ))}
        </Root>
    );
}
