# Markdown Renderer

A fast, lightweight markdown parser that converts markdown text to HTML. Built for performance while supporting comprehensive markdown features.

## What it does

- **Headings** (# ## ### etc.)
- **Text formatting**: **Bold**, *italic*, and ~~strikethrough~~
- **Code**: `inline code` and fenced code blocks with syntax highlighting support
- **Links**: Both standalone and [inline links](http://example.com) with titles
- **Images**: ![alt text](image.jpg "title") with alt text and titles
- **Lists**: Both bulleted and numbered lists
- **Blockquotes** for emphasized content
- **Horizontal rules** (---, ***, ___)
- **Paragraphs** with proper line break handling

## Table of Contents

- [Markdown Renderer](#markdown-renderer)
  - [What it does](#what-it-does)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
  - [How it Works](#how-it-works)
    - [Parser](#parser)
    - [Renderer](#renderer)
  - [What's Missing](#whats-missing)
  - [TODO](#todo)
  - [Performance](#performance)
  - [Contributing](#contributing)
  - [License](#license)

## Getting Started

```bash
git clone https://github.com/Vaksoa/Markdown-Renderer.git
cd Markdown-Renderer
bun install
bun run dev
```

## How it Works

### Parser

The parser takes your markdown text and turns it into an AST (basically a tree structure that represents your content). It goes through each line and figures out what type of element it is.

```js
const parseMarkdown = (markdown) => {
    // Creates an AST from markdown text
    // Handles different types of content like headings, lists, etc.
    
    return abstractSyntaxTree;
}

module.exports = {parseMarkdown};
```

### Renderer  

The renderer takes that AST and converts it to actual HTML you can use.

```js
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
    // Converts AST nodes to HTML with proper escaping
};

module.exports = {renderMarkdown};
```

## What's Missing

This parser now covers most common markdown features! Some advanced features that could be added:

- Tables (| Header | Header |)
- Nested lists with proper indentation
- Proper escaping with backslashes
- Task lists (- [x] completed, - [ ] todo)
- Indented code blocks (4-space indentation)
- Reference-style links

## TODO

- [x] Basic parser that handles common markdown elements
- [x] HTML renderer 
- [x] Support for ordered lists
- [x] **Inline code spans** (`` `code` ``)
- [x] **Fenced code blocks** with language support
- [x] **Images** with alt text and titles
- [x] **Horizontal rules** (---, ***, ___)
- [x] **Inline links** with formatting support
- [x] **Strikethrough** formatting
- [ ] Tables
- [ ] Proper nested lists
- [ ] Better escaping with backslashes
- [ ] Task lists (GitHub extension)
- [ ] Indented code blocks
- [ ] Better error handling

## Performance

TODO

## Contributing

Feel free to contribute! Here's how:

- Found a bug? Open an issue
- Want to add a feature? Fork it and make a PR

No formal process here, just trying to make this thing better.

## License

MIT License - do whatever you want with it. See [LICENSE](LICENSE) for the legal stuff.