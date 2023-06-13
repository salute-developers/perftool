import React, { CSSProperties, ChangeEvent } from 'react';

type Props = {
    onSelect: (color: string) => void;
    current: string;
    style: CSSProperties;
};

const rootStyle = { display: 'flex', flexDirection: 'row' } as const;
const labelStyle = { paddingRight: '1rem' } as const;

function ColorPicker({ style, onSelect, current }: Props) {
    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        onSelect(e.target.value);
    }

    return (
        <div style={{ ...style, ...rootStyle }}>
            <div style={labelStyle}>Background color: </div>
            <input type="color" value={current} onChange={handleChange} />
        </div>
    );
}

export default ColorPicker;
