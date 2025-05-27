const parseMarkdown = (markdown) => {
    let abstractSyntaxTree = {type: 'document', children: []};
    let currentNode = abstractSyntaxTree;
    let currentIndentation = 0;
    let nodeStack = [currentNode];

    const lines = markdown.split("\n");

    const createNode = (type, properties) => {
        const node = {type};
        Object.assign(node, properties);
        Object.freeze(node);
        return node;
    };

    const updateNodeStackAndIndentation = (newNode, indentation) => {
        const nodeStackLength = nodeStack.length;
        const parentNode = nodeStack[nodeStackLength - 1];

        if (indentation > currentIndentation) {
            let parentChildren = parentNode.children;
            if (!parentChildren) {
                parentChildren = parentNode.children = [];
            }
            parentChildren.push(newNode);
            nodeStack.push(newNode);
            currentNode = newNode;
            currentIndentation = indentation;
        } else {
            while (indentation < currentIndentation) {
                nodeStack.pop();
                currentNode = nodeStack[nodeStack.length - 1];
                currentIndentation = currentNode.value ? currentNode.value.search(/\S|$/) : 0;
            }
        }
    };

    const regexPatterns = {
        heading: /^(#{1,6})\s(.*)/,
        italic: /^(\*{1})(?!\1)(.*?)\1(?!\1)/,
        bold: /^(\*{2})(.*?)\1/,
        strikethrough: /^(\~\~)(.*?)\1/,
        quote: /^(>)\s(.*)/,
        link: /^\[(.*)\]\((.*)\)/,
        listItem: /^(\s*-\s)(.*)/,
        orderedListItem: /^(\s*\d+\.\s)(.*)/,
    };

    const regexPatternsToNodeTypes = {
        heading: ['heading', (matches) => ({level: matches[1].length})],
        italic: ['emphasis', (matches) => ({})],
        bold: ['strong', (matches) => ({})],
        strikethrough: ['strikethrough', (matches) => ({})],
        quote: ['quote', (matches) => ({})],
        link: ['link', (matches) => ({url: matches[2]})],
        listItem: ['list-item', (matches) => ({})],
        orderedListItem: ['ordered-list-item', (matches) => ({})],
    };

    const parseInlineFormatting = (text) => {
        const inlineNodes = [];
        let currentText = '';
        const textLength = text.length;

        for (let i = 0; i < textLength; i++) {
            const char = text[i];

            switch (char) {
                case '*': {
                    const nextChar = text[i + 1];

                    if (nextChar === '*') {
                        if (currentText.length > 0) {
                            inlineNodes.push(createNode('text', { value: currentText }));
                            currentText = '';
                        }

                        // Use a regular expression to match ** followed by a word boundary
                        const boldTextEnd = text.search(/\*\*(?=\b)/, i + 2);
                        if (boldTextEnd !== -1) {
                            const boldText = text.substring(i + 2, boldTextEnd);
                            const boldNode = createNode('strong', { children: parseInlineFormatting(boldText) });
                            inlineNodes.push(boldNode);
                            i = boldTextEnd + 1;
                        }
                    } else {
                        if (currentText.length > 0) {
                            inlineNodes.push(createNode('text', { value: currentText }));
                            currentText = '';
                        }

                        // Use a regular expression to match * followed by a word boundary
                        const italicTextEnd = text.search(/\*(?=\b)/, i + 1);
                        if (italicTextEnd !== -1) {
                            const italicText = text.substring(i + 1, italicTextEnd);
                            const italicNode = createNode('emphasis', { children: parseInlineFormatting(italicText) });
                            inlineNodes.push(italicNode);
                            i = italicTextEnd;
                        }
                    }
                    break;
                }
                case '~': { // Added case for ~ character
                    const nextChar = text[i + 1];

                    if (nextChar === '~') {
                        if (currentText.length > 0) {
                            inlineNodes.push(createNode('text', { value: currentText }));
                            currentText = '';
                        }

                        // Use a regular expression to match ~~ followed by a word boundary
                        const strikethroughTextEnd = text.search(/\~\~(?=\b)/, i + 2);
                        if (strikethroughTextEnd !== -1) {
                            const strikethroughText = text.substring(i + 2, strikethroughTextEnd);
                            const strikethroughNode = createNode('strikethrough', { children: parseInlineFormatting(strikethroughText) });
                            inlineNodes.push(strikethroughNode);
                            i = strikethroughTextEnd + 1;
                        }
                    }
                    break;
                }
                default:
                    currentText += char;
            }
        }

        if (currentText.length > 0) {
            inlineNodes.push(createNode('text', { value: currentText }));
        }

        return inlineNodes;
    };

    const handleListItem = (line, indentation) => {
        const listItemMatch = line.match(regexPatterns.listItem);
        const orderedListItemMatch = line.match(regexPatterns.orderedListItem);
        if (listItemMatch || orderedListItemMatch) {
            const listItemNode = createNode(listItemMatch ? 'list-item' : 'ordered-list-item', {
                children: [createNode('text', { value: listItemMatch ? listItemMatch[2] : orderedListItemMatch[2] })],
            });

            // Check if the previous sibling is a list
            const nodeStackLength = nodeStack.length;
            const parentNode = nodeStack[nodeStackLength - 1];
            const prevSibling = parentNode.children[parentNode.children.length - 1];
            if (prevSibling && prevSibling.type === (listItemMatch ? 'list' : 'ordered-list')) {
                // Add the current list item to the existing list
                prevSibling.children.push(listItemNode);
            } else {
                // Create a new list and add the list item to it
                const listNode = createNode(listItemMatch ? 'list' : 'ordered-list', { children: [listItemNode] });
                parentNode.children.push(listNode);
            }

            updateNodeStackAndIndentation(listItemNode, indentation);
            return true;
        }
        return false;
    };

    const handleLineBreak = (line, indentation) => {
        const trimmedLine = line.trim();
        if (trimmedLine === '') {
            const childrenLength = currentNode.children.length;
            const lastChild = childrenLength > 0 && currentNode.children[childrenLength - 1];
            lastChild && lastChild.type !== 'line-break' && currentNode.children.push(createNode('line-break', {}));
            return true;
        }
        return false;
    };

    const createNodeFromLine = (line, indentation) => {
        for (const key in regexPatternsToNodeTypes) {
            const matches = line.match(regexPatterns[key]);

            if (matches) {
                const [nodeType, getProperties] = regexPatternsToNodeTypes[key];
                currentNode.children.push(createNode(nodeType, {
                    ...getProperties(matches),
                    children: parseInlineFormatting(matches[2]),
                }));
                return true;
            }
        }
        return false;
    };

    const createTextNode = (line, indentation, parentType) => {
        const textNode = createNode('text', {value: line});
        currentNode.children = parentType === 'list-item' || parentType === 'heading' ? currentNode.children : currentNode.children.concat(createNode('paragraph', {children: [textNode]}));
        return true;
    };

    const handlers = [
        handleLineBreak,
        createNodeFromLine,
        handleListItem,
        (line, indentation) => createTextNode(line, indentation, currentNode.type),
    ];

    const linesLength = lines.length;
    const handlersLength = handlers.length;

    for (let i = 0; i < linesLength; i++) {
        const line = lines[i];
        const indentation = line.search(/\S|$/);

        let j = 0;
        let handlerResult = handlers[j](line, indentation);
        while (!handlerResult && j < handlersLength - 1) {
            j++;
            handlerResult = handlers[j](line, indentation);
        }
    }

    return abstractSyntaxTree;
}

module.exports = {parseMarkdown};