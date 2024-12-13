const detectChanges = (newNodes, currentNodes, key) => {
    const addedNodes = newNodes.filter(node => !currentNodes.some(existingNode => existingNode[key] === node[key]));
    const removedNodes = currentNodes.filter(node => !newNodes.some(newNode => newNode[key] === node[key]));

    return { addedNodes, removedNodes };
};

module.exports = detectChanges;