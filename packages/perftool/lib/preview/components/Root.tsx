import React, { useState } from 'react';

import { Subject } from '../../client/measurement/runner';

import Selector from './Selector';
import ColorPicker from './ColorPicker';
import Preview from './Preview';

type Props = {
    subjects: Subject[];
};

const headerStyle = {
    position: 'absolute',
    width: '100%',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem',
    borderBottom: '1px solid black',
    color: '#222',
    zIndex: 99999,
} as const;
const hiddenButtonStyle = {
    position: 'absolute',
    zIndex: 99999,
} as const;
const itemStyle = { marginTop: 0, marginBottom: '0.5rem' } as const;

function Root({ subjects }: Props) {
    const [isPanelVisible, setPanelVisibility] = useState(true);
    const [currentIndex, setIndex] = useState<number>(0);
    const [background, setBackground] = useState<string>('#ffffff');
    const { Component } = subjects[currentIndex];

    return (
        <>
            {isPanelVisible && (
                <header style={headerStyle}>
                    <h1 style={itemStyle}>Test components preview</h1>
                    <Selector
                        style={itemStyle}
                        subjectsIds={subjects.map(({ id }) => id)}
                        onSelect={setIndex}
                        currentIndex={currentIndex}
                    />
                    <ColorPicker style={itemStyle} onSelect={setBackground} current={background} />
                    <div>
                        <button type="button" onClick={() => setPanelVisibility(false)}>
                            Hide
                        </button>
                    </div>
                </header>
            )}
            {!isPanelVisible && (
                <button style={hiddenButtonStyle} type="button" onClick={() => setPanelVisibility(true)}>
                    Show preview panel
                </button>
            )}
            <Preview Component={Component} background={background} />
        </>
    );
}

export default Root;
