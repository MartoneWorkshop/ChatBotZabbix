const detectChanges = (newNodes, previousNodes, key) => {
    const addedNodes = newNodes.filter(node => !previousNodes.some(pn => pn[key] === node[key]));
    const removedNodes = previousNodes.filter(node => !newNodes.some(nn => nn[key] === node[key]));
    return { addedNodes, removedNodes };
};

module.exports = detectChanges;