const GFM_PUNCTUATION = '!"#$%&\'()*+,-./:;<=>?@[\]^_`{|}~';

const REGEX_PATTERNS = {
    heading: /^(#{1,6})\s(.*)/,
    quote: /^(>)\s(.*)/,
    link: /^\[([^\]]*)\]\(([^)]+)\)$/,
    image: /^!\[(.*?)\]\(([^)]+)\)/,
    horizontalRule: /^(---+|___+|\*\*\*(?!\*)|(?:\*{5,})|\s*-\s*-\s*-[\s-]*|\s*_\s*_\s*_[\s_]*|\s+\*\s+\*\s+\*[\s*]*)$/,
    fencedCodeBlock: /^(```|~~~)(.*)$/,
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
        image: ['image', (matches) => {
            const url = matches[2];
            const titleMatch = url.match(/^(.*?)\s+"([^"]+)"$/);
            if (titleMatch) {
                return { alt: matches[1], src: titleMatch[1], title: titleMatch[2] };
            }
            return { alt: matches[1], src: url, title: null };
        }, null],
        horizontalRule: ['horizontal-rule', () => ({}), null],
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


            if (char === '`') {

                let backtickCount = 0;
                let j = i;
                while (j < textLength && text[j] === '`') {
                    backtickCount++;
                    j++;
                }


                let endPos = -1;
                for (let k = j; k <= textLength - backtickCount; k++) {
                    let match = true;
                    for (let b = 0; b < backtickCount; b++) {
                        if (text[k + b] !== '`') {
                            match = false;
                            break;
                        }
                    }
                    if (match) {

                        if (k + backtickCount >= textLength || text[k + backtickCount] !== '`') {
                            endPos = k;
                            break;
                        }
                    }
                }



                if (endPos === -1 && backtickCount === 2 && (j >= textLength || text[j] === ' ')) {
                    endPos = i + 1;
                    j = i + 1;
                    backtickCount = 1;
                }

                if (endPos !== -1) {
                    if (currentText.length > 0) {
                        inlineNodes.push(createInlineTextNode(currentText));
                        currentText = '';
                    }

                    let content = text.substring(i + backtickCount, endPos);


                    if (content.length >= 2 && content[0] === ' ' && content[content.length - 1] === ' ') {


                        if (content.length === 2 || (content[1] !== ' ' && content[content.length - 2] !== ' ')) {
                            content = content.substring(1, content.length - 1);
                        }
                    }

                    inlineNodes.push({
                        type: 'code',
                        value: content
                    });
                    consumedLen = (endPos + backtickCount) - i;
                    foundFormatting = true;
                }
            }

            else if (char === '!' && i + 1 < textLength && text[i + 1] === '[') {

                const imageMatch = text.substring(i).match(/^!\[([^\]]*)\]\(([^)]+)\)/);
                if (imageMatch) {
                    if (currentText.length > 0) {
                        inlineNodes.push(createInlineTextNode(currentText));
                        currentText = '';
                    }

                    const alt = imageMatch[1];
                    const url = imageMatch[2];
                    const titleMatch = url.match(/^(.*?)\s+"([^"]+)"$/);

                    const imageNode = {
                        type: 'image',
                        alt: alt,
                        src: titleMatch ? titleMatch[1] : url,
                        title: titleMatch ? titleMatch[2] : null
                    };

                    inlineNodes.push(imageNode);
                    consumedLen = imageMatch[0].length;
                    foundFormatting = true;
                }
            }
            else if (char === '[') {

                const linkMatch = text.substring(i).match(/^\[([^\]]*)\]\(([^)]+)\)/);
                if (linkMatch) {
                    if (currentText.length > 0) {
                        inlineNodes.push(createInlineTextNode(currentText));
                        currentText = '';
                    }

                    const linkText = linkMatch[1];
                    const url = linkMatch[2];
                    const titleMatch = url.match(/^(.*?)\s+"([^"]+)"$/);

                    const linkNode = {
                        type: 'link',
                        url: titleMatch ? titleMatch[1] : url,
                        children: parseInlineFormatting(linkText)
                    };

                    if (titleMatch) {
                        linkNode.title = titleMatch[2];
                    }

                    inlineNodes.push(linkNode);
                    consumedLen = linkMatch[0].length;
                    foundFormatting = true;
                }
            }
            else if (char === '\\' && i + 1 < textLength) {
                const nextChar = text[i + 1];
                if (ESCAPABLE_CHARS.has(nextChar)) {
                    currentText += nextChar;
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

    const handleFencedCodeBlock = (line, lineIndex) => {
        const fenceMatch = line.match(REGEX_PATTERNS.fencedCodeBlock);
        if (!fenceMatch) return false;

        const fence = fenceMatch[1];
        const info = fenceMatch[2].trim();
        const fenceLength = fence.length;


        let endLineIndex = -1;
        for (let i = lineIndex + 1; i < lines.length; i++) {
            const currentLine = lines[i];

            const closingRegex = new RegExp(`^${fence.charAt(0)}{${fenceLength},}\\s*$`);
            if (closingRegex.test(currentLine)) {
                endLineIndex = i;
                break;
            }
        }

        if (endLineIndex === -1) {

            return false;
        }


        const codeLines = lines.slice(lineIndex + 1, endLineIndex);
        const content = codeLines.join('\n');


        let language = null;
        let meta = null;
        if (info) {
            const parts = info.split(/\s+/);
            language = parts[0] || null;
            if (parts.length > 1) {
                meta = parts.slice(1).join(' ');
            }
        }

        const codeBlockNode = {
            type: 'code-block',
            language: language,
            value: content
        };

        if (meta) {
            codeBlockNode.meta = meta;
        }

        currentParentNode.children.push(codeBlockNode);


        return endLineIndex - lineIndex + 1;
    };

    const createNodeFromLine = (line) => {
        for (const key in regexPatternsToNodeTypes) {
            const matches = line.match(REGEX_PATTERNS[key]);

            if (matches && matches.index === 0) {
                const [nodeType, getProperties, contentGroupIndex] = regexPatternsToNodeTypes[key];

                const node = {
                    type: nodeType,
                    ...getProperties(matches)
                };


                if (contentGroupIndex !== null && contentGroupIndex !== undefined) {
                    const content = matches[contentGroupIndex] || '';
                    node.children = parseInlineFormatting(content);
                }

                currentParentNode.children.push(node);
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
        (line, lineIndex) => handleFencedCodeBlock(line, lineIndex),
        createNodeFromLine,
        handleListItem,
        createTextNode,
    ];

    for (let i = 0; i < lineCount; i++) {
        const line = lines[i];

        for (let j = 0; j < handlers.length; j++) { 
            const result = handlers[j](line, i);
            if (result === true || typeof result === 'number') {
                if (typeof result === 'number') {

                    i += result - 1;
                }
                break;
            }
        }
    }

    return abstractSyntaxTree;
};

module.exports = { parseMarkdown };