import React, { useState } from 'react';

import { Subject } from '../../client/measurement/runner';

import Selector from './Selector';
import ColorPicker from './ColorPicker';
import Preview from './Preview';

type Props = {
    subjects: Subject[];
};

const headerStyle = {
    display: 'flex',
    flexDirection: 'column',
    margin: '1rem',
    borderBottom: '1px solid black',
} as const;
const itemStyle = { marginBottom: '0.5rem' } as const;
const previewStyle = { margin: '0.5rem 1rem', border: 'none', width: 'calc(100% - 2rem)', height: '75vh' };

function Root({ subjects }: Props) {
    const [currentIndex, setIndex] = useState<number>(0);
    const [background, setBackground] = useState<string>('#ffffff');
    const { Component } = subjects[currentIndex];

    return (
        <>
            <header style={headerStyle}>
                <h1 style={itemStyle}>Test components preview</h1>
                <Selector
                    style={itemStyle}
                    subjectsIds={subjects.map(({ id }) => id)}
                    onSelect={setIndex}
                    currentIndex={currentIndex}
                />
                <ColorPicker style={itemStyle} onSelect={setBackground} current={background} />
            </header>
            <Preview style={previewStyle} Component={Component} background={background} />
        </>
    );
}

export default Root;
