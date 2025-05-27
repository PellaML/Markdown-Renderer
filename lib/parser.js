const GFM_PUNCTUATION = '!"#$%&\'()*+,-./:;<=>?@[\]^_`{|}~';

const REGEX_PATTERNS = {
    heading: /^(#{1,6})\s(.*)/,
    quote: /^(>)\s(.*)/,
    link: /^\[(.*?)\]\((.*?)\)/,
    listItem: /^(\s*-\s)(.*)/,
    orderedListItem: /^(\s*\d+\.\s)(.*)/,
    whitespace: /\s/
};

const ESCAPABLE_CHARS = new Set(['!', '"', '#', '$', '%', '&', '\'', '(', ')', '*', '+', ',', '-', '.', '/', ':', ';', '<', '=', '>', '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|', '}', '~']);

const GFM_PUNCTUATION_SET = new Set(GFM_PUNCTUATION);

function isGfmWhitespaceOrPunctuation(char) {
    if (char === undefined) return false;
    return REGEX_PATTERNS.whitespace.test(char) || GFM_PUNCTUATION_SET.has(char);
}

const parseMarkdown = (markdown) => {
    if (markdown === '') {
        return { type: 'document', children: [] };
    }

    const lines = markdown.split("\n");
    const lineCount = lines.length;

    let hasNonBlankLine = false;
    for (let i = 0; i < lineCount; i++) {
        if (lines[i].trim() !== '') {
            hasNonBlankLine = true;
            break;
        }
    }

    if (!hasNonBlankLine) {
        if (lineCount === 1 && lines[0].length > 0 && lines[0].trim() === '') {
            // Single line of only spaces, let it become a paragraph
        } else {
            return { type: 'document', children: [] };
        }
    }

    let abstractSyntaxTree = { type: 'document', children: [] };
    let currentParentNode = abstractSyntaxTree;

    const createInlineTextNode = (value) => ({ type: 'text', value });

    const regexPatternsToNodeTypes = {
        heading: ['heading', (matches) => ({ level: matches[1].length }), 2],
        quote: ['quote', () => ({}), 2],
        link: ['link', (matches) => ({ url: matches[2] }), 1],
    };

    const parseInlineFormatting = (text) => {
        const inlineNodes = [];
        const textLength = text.length;
        let currentText = '';
        let i = 0;

        while (i < textLength) {
            const char = text[i];
            let consumedLen = 0;
            let foundFormatting = false;

            if (char === '\\' && i + 1 < textLength) {
                const nextChar = text[i + 1];
                if (ESCAPABLE_CHARS.has(nextChar)) {
                    currentText += '\\' + nextChar;
                    consumedLen = 2;
                    foundFormatting = true;
                }
            }
            else if (!foundFormatting && char === '*' && i + 3 < textLength &&
                text[i + 1] === '*' && text[i + 2] === '*' && text[i + 3] === '*') {
                currentText += "****";
                consumedLen = 4;
                foundFormatting = true;
            }
            else if (!foundFormatting && char === '~' && i + 1 < textLength && text[i + 1] === '~') {
                const endIndex = text.indexOf('~~', i + 2);
                if (endIndex !== -1 && endIndex > i + 2) {
                    if (currentText.length > 0) {
                        inlineNodes.push(createInlineTextNode(currentText));
                        currentText = '';
                    }
                    const content = text.substring(i + 2, endIndex);
                    inlineNodes.push({
                        type: 'strikethrough',
                        children: parseInlineFormatting(content)
                    });
                    consumedLen = (endIndex + 2) - i;
                    foundFormatting = true;
                } else {
                    currentText += '~~';
                    consumedLen = 2;
                    foundFormatting = true;
                }
            }
            else if (!foundFormatting && char === '*') {
                if (i + 1 < textLength && text[i + 1] === '*') {
                    let endIndex = text.indexOf('**', i + 2);

                    if (endIndex !== -1 && i + 2 < textLength && text[i + 2] === '*') {
                        const nextEndIndex = text.indexOf('**', endIndex + 1);
                        if (nextEndIndex !== -1) {
                            const altContent = text.substring(i + 2, nextEndIndex);
                            if (altContent.length > 2 && altContent.startsWith('*') && altContent.endsWith('*')) {
                                endIndex = nextEndIndex;
                            }
                        }
                    }

                    if (endIndex !== -1 && endIndex > i + 2) {
                        if (currentText.length > 0) {
                            inlineNodes.push(createInlineTextNode(currentText));
                            currentText = '';
                        }
                        const content = text.substring(i + 2, endIndex);
                        inlineNodes.push({
                            type: 'strong',
                            children: parseInlineFormatting(content)
                        });
                        consumedLen = (endIndex + 2) - i;
                        foundFormatting = true;
                    } else {
                        currentText += '**';
                        consumedLen = 2;
                        foundFormatting = true;
                    }
                } else {
                    let endIndex = -1;
                    let foundEndMarker = false;

                    for (let k = i + 1; k < textLength; k++) {
                        if (text[k] === '*') {
                            const isPrevCharStar = (k > 0 && text[k - 1] === '*' && (k - 1) !== i);
                            const isNextCharStar = (k + 1 < textLength && text[k + 1] === '*');
                            const canBeFollowedByStar = isNextCharStar && (k + 2 < textLength && text[k + 2] === '*');

                            if (!isPrevCharStar && (!isNextCharStar || canBeFollowedByStar)) {
                                endIndex = k;
                                foundEndMarker = true;
                                break;
                            }
                        }
                    }

                    if (foundEndMarker && endIndex > i + 1) {
                        if (currentText.length > 0) {
                            inlineNodes.push(createInlineTextNode(currentText));
                            currentText = '';
                        }
                        const content = text.substring(i + 1, endIndex);
                        inlineNodes.push({
                            type: 'emphasis',
                            children: parseInlineFormatting(content)
                        });
                        consumedLen = (endIndex + 1) - i;
                        foundFormatting = true;
                    }
                }
            }

            if (foundFormatting) {
                i += consumedLen;
            } else {
                currentText += char;
                i++;
            }
        }

        if (currentText.length > 0) {
            inlineNodes.push(createInlineTextNode(currentText));
        }
        return inlineNodes;
    };

    const handleListItem = (line) => {
        const listItemMatch = line.match(REGEX_PATTERNS.listItem);
        const orderedListItemMatch = line.match(REGEX_PATTERNS.orderedListItem);
        let match, content, itemNodeType, listNodeType;

        if (listItemMatch) {
            match = listItemMatch;
            content = match[2];
            itemNodeType = 'list-item';
            listNodeType = 'list';
        } else if (orderedListItemMatch) {
            match = orderedListItemMatch;
            content = match[2];
            itemNodeType = 'ordered-list-item';
            listNodeType = 'ordered-list';
        } else {
            return false;
        }

        const listItemNode = {
            type: itemNodeType,
            children: parseInlineFormatting(content)
        };

        const parentChildren = currentParentNode.children;
        const prevSibling = parentChildren.length > 0 ? parentChildren[parentChildren.length - 1] : null;

        if (prevSibling && prevSibling.type === listNodeType) {
            prevSibling.children.push(listItemNode);
        } else {
            const newList = {
                type: listNodeType,
                children: [listItemNode]
            };
            parentChildren.push(newList);
        }
        return true;
    };

    const handleLineBreak = (line) => {
        if (line.trim() === '' && line.length === 0) {
            currentParentNode.children.push({ type: 'line-break' });
            return true;
        }
        return false;
    };

    const createNodeFromLine = (line) => {
        for (const key in regexPatternsToNodeTypes) {
            const matches = line.match(REGEX_PATTERNS[key]);

            if (matches && matches.index === 0) {
                const [nodeType, getProperties, contentGroupIndex] = regexPatternsToNodeTypes[key];
                const content = matches[contentGroupIndex] || '';

                currentParentNode.children.push({
                    type: nodeType,
                    ...getProperties(matches),
                    children: parseInlineFormatting(content)
                });
                return true;
            }
        }
        return false;
    };

    const createTextNode = (line) => {
        const trimmedLine = line.trim();
        if (trimmedLine === '' && line.length > 0) {
            const inlineChildren = parseInlineFormatting(line);
            if (inlineChildren.length > 0) {
                currentParentNode.children.push({
                    type: 'paragraph',
                    children: inlineChildren
                });
                return true;
            }
        } else if (trimmedLine !== '') {
            const inlineChildren = parseInlineFormatting(line);
            if (inlineChildren.length > 0) {
                currentParentNode.children.push({
                    type: 'paragraph',
                    children: inlineChildren
                });
                return true;
            }
        }
        return false;
    };

    const handlers = [
        handleLineBreak,
        createNodeFromLine,
        handleListItem,
        createTextNode,
    ];

    for (let i = 0; i < lineCount; i++) {
        const line = lines[i];

        for (let j = 0; j < handlers.length; j++) {
            if (handlers[j](line)) {
                break;
            }
        }
    }

    return abstractSyntaxTree;
};

module.exports = { parseMarkdown };