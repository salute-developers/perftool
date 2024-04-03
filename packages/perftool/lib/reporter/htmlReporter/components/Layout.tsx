import React, { CSSProperties } from 'react';

import { currentReport } from '../data';

import { View } from './common';

type Props = {
    view: View;
    setView: (v: View) => void;
};

const headerStyle: CSSProperties = {
    width: 'calc(100vw - 80px)',
    background: '#fff',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '0 40px',
    borderBottom: '1px solid #ddd',
    color: '#222',
};
const bodyStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    minWidth: '50vw',
};
const ulStyle: CSSProperties = {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'row',
};
const buttonStyle: CSSProperties = {
    fontWeight: 500,
    all: 'unset',
};
const liCheckedStyle: CSSProperties = {
    borderBottom: '1px solid #aaa',
};
const liStyle: CSSProperties = {
    padding: '10px',
    cursor: 'pointer',
};
const versionStyle: CSSProperties = {
    marginLeft: 'auto',
    color: 'lightgray',
};

export default function Layout({ view, setView, children }: React.PropsWithChildren<Props>) {
    return (
        <>
            <header style={headerStyle}>
                <h1>Perftool Report</h1>
                <ul style={ulStyle}>
                    <li style={{ ...liStyle, ...(view === 'summary' ? liCheckedStyle : {}) }}>
                        <button style={buttonStyle} type="button" onClick={() => setView('summary')}>
                            Summary
                        </button>
                    </li>
                    <li style={{ ...liStyle, ...(view === 'components' ? liCheckedStyle : {}) }}>
                        <button style={buttonStyle} type="button" onClick={() => setView('components')}>
                            Components
                        </button>
                    </li>
                    <li style={{ ...liStyle, ...(view === 'raw' ? liCheckedStyle : {}) }}>
                        <button style={buttonStyle} type="button" onClick={() => setView('raw')}>
                            Raw
                        </button>
                    </li>
                </ul>
                <div style={versionStyle}>{currentReport.version}</div>
            </header>
            <div style={bodyStyle}>{children}</div>
        </>
    );
}
