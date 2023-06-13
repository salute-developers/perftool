function createContainer(): HTMLElement {
    const container = document.createElement('div');
    document.body.appendChild(container);

    return container;
}

export default createContainer;
