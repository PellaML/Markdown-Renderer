const renderChildElements = (markdownNode) => {
    return markdownNode.children.reduce((acc, child) => acc + renderMarkdown(child), '');
};

const escapeHtml = (text) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const renderFunctions = {
    document: renderChildElements,
    div: (node) => `<div>${renderChildElements(node)}</div>`,
    'line-break': () => '<br>',
    heading: (node) => `<h${node.level}>${renderChildElements(node)}</h${node.level}>`,
    emphasis: (node) => `<em>${renderChildElements(node)}</em>`,
    strong: (node) => `<strong>${renderChildElements(node)}</strong>`,
    strikethrough: (node) => `<del>${renderChildElements(node)}</del>`,
    quote: (node) => `<blockquote><p>${renderChildElements(node)}</p></blockquote>`,
    link: (node) => `<a href="${escapeHtml(node.url)}"${node.title ? ` title="${escapeHtml(node.title)}"` : ''}>${renderChildElements(node)}</a>`,
    image: (node) => `<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}"${node.title ? ` title="${escapeHtml(node.title)}"` : ''}>`,
    list: (node) => `<ul>${renderChildElements(node)}</ul>`,
    'list-item': (node) => `<li>${renderChildElements(node)}</li>`,
    'ordered-list': (node) => `<ol>${renderChildElements(node)}</ol>`,
    'ordered-list-item': (node) => `<li>${renderChildElements(node)}</li>`,
    'horizontal-rule': () => '<hr>',
    'code-block': (node) => `<pre><code${node.language ? ` class="language-${escapeHtml(node.language)}"` : ''}>${escapeHtml(node.value)}</code></pre>`,
    'code': (node) => `<code>${escapeHtml(node.value)}</code>`,
    paragraph: (node) => `<p>${renderChildElements(node)}</p>`,
    text: (node) => escapeHtml(node.value),
};

const renderMarkdown = (markdownNode) => {
    const renderFunction = renderFunctions[markdownNode.type];
    return renderFunction ? renderFunction(markdownNode) : '';
};

module.exports = {renderMarkdown};