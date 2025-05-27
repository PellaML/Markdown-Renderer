# Markdown Renderer

A simple markdown parser that converts markdown text to HTML. Nothing fancy, just the basics done well.

## What it does

- Headings (# ## ### etc.)
- **Bold** and *italic* text  
- ~~Strikethrough~~
- Blockquotes
- Links
- Lists (both bulleted and numbered)
- Regular paragraphs

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
const renderFunctions = {
    document: renderChildElements,
    div: (node) => `<div>${renderChildElements(node)}</div>`,
    'line-break': () => '<br>',
    heading: (node) => `<h${node.level}>${renderChildElements(node)}</h${node.level}>`,
    emphasis: (node) => `<em>${renderChildElements(node)}</em>`,
    strong: (node) => `<strong>${renderChildElements(node)}</strong>`,
    quote: (node) => `<blockquote><p>${renderChildElements(node)}</p></blockquote>`,
    link: (node) => `<a href="${node.url}">${renderChildElements(node)}</a>`,
    list: (node) => `<ul>${renderChildElements(node)}</ul>`,
    'list-item': (node) => `<li>${renderChildElements(node)}</li>`,
    paragraph: (node) => `<p>${renderChildElements(node)}</p>`,
    text: (node) => `${node.value}`,
};

const renderMarkdown = (markdownNode) => {
    // Converts AST nodes to HTML
};

module.exports = {renderMarkdown};
```

## What's Missing

This isn't a full markdown parser yet. Some stuff that would be nice to add:

- Tables
- Code blocks with syntax highlighting  
- Images
- Better nested list support
- Inline code spans

## TODO

- [x] Basic parser that handles common markdown elements
- [x] HTML renderer 
- [x] Support for ordered lists
- [ ] Tables
- [ ] Code blocks with syntax highlighting
- [ ] Images
- [ ] Inline code spans
- [ ] Better error handling

## Contributing

Feel free to contribute! Here's how:

- Found a bug? Open an issue
- Want to add a feature? Fork it and make a PR

No formal process here, just trying to make this thing better.

## License

MIT License - do whatever you want with it. See [LICENSE](LICENSE) for the legal stuff.