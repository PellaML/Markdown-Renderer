import { describe, it, expect } from "bun:test";

const assert = require('assert');
const { renderMarkdown } = require('../lib/renderer');

const T = (value) => ({ type: 'text', value: String(value) });

describe('Markdown Renderer Tests', () => {

    describe('Basic Structure and Empty Inputs', () => {
        it('should render empty document', () => {
            const ast = { type: 'document', children: [] };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '');
        });

        it('should render document with children', () => {
            const ast = {
                type: 'document',
                children: [
                    { type: 'paragraph', children: [T('Hello world')] }
                ]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<p>Hello world</p>');
        });

        it('should handle unknown node types gracefully', () => {
            const ast = { type: 'unknown-type', children: [] };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '');
        });
    });

    describe('Text Nodes', () => {
        it('should render plain text', () => {
            const ast = T('Hello world');
            const html = renderMarkdown(ast);
            assert.strictEqual(html, 'Hello world');
        });

        it('should escape HTML characters in text', () => {
            const ast = T('<script>alert("xss")</script>');
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        });

        it('should escape all special HTML characters', () => {
            const ast = T('&<>"\'');
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '&amp;&lt;&gt;&quot;&#39;');
        });

        it('should handle empty text', () => {
            const ast = T('');
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '');
        });

        it('should handle text with spaces', () => {
            const ast = T('   spaced   text   ');
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '   spaced   text   ');
        });
    });

    describe('Paragraphs', () => {
        it('should render simple paragraph', () => {
            const ast = {
                type: 'paragraph',
                children: [T('Hello world')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<p>Hello world</p>');
        });

        it('should render paragraph with multiple text nodes', () => {
            const ast = {
                type: 'paragraph',
                children: [T('Hello '), T('world')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<p>Hello world</p>');
        });

        it('should render empty paragraph', () => {
            const ast = {
                type: 'paragraph',
                children: []
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<p></p>');
        });

        it('should escape HTML in paragraph content', () => {
            const ast = {
                type: 'paragraph',
                children: [T('<b>Bold</b>')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<p>&lt;b&gt;Bold&lt;/b&gt;</p>');
        });
    });

    describe('Headings', () => {
        for (let level = 1; level <= 6; level++) {
            it(`should render heading level ${level}`, () => {
                const ast = {
                    type: 'heading',
                    level: level,
                    children: [T(`Heading ${level}`)]
                };
                const html = renderMarkdown(ast);
                assert.strictEqual(html, `<h${level}>Heading ${level}</h${level}>`);
            });
        }

        it('should render heading with multiple children', () => {
            const ast = {
                type: 'heading',
                level: 2,
                children: [
                    T('Hello '),
                    { type: 'emphasis', children: [T('world')] }
                ]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<h2>Hello <em>world</em></h2>');
        });

        it('should render empty heading', () => {
            const ast = {
                type: 'heading',
                level: 3,
                children: []
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<h3></h3>');
        });

        it('should escape HTML in heading content', () => {
            const ast = {
                type: 'heading',
                level: 1,
                children: [T('<script>alert("xss")</script>')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<h1>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</h1>');
        });
    });

    describe('Inline Formatting', () => {
        it('should render emphasis', () => {
            const ast = {
                type: 'emphasis',
                children: [T('italic text')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<em>italic text</em>');
        });

        it('should render strong', () => {
            const ast = {
                type: 'strong',
                children: [T('bold text')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<strong>bold text</strong>');
        });

        it('should render strikethrough', () => {
            const ast = {
                type: 'strikethrough',
                children: [T('deleted text')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<del>deleted text</del>');
        });

        it('should render nested formatting', () => {
            const ast = {
                type: 'strong',
                children: [
                    T('bold '),
                    { type: 'emphasis', children: [T('and italic')] },
                    T(' text')
                ]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<strong>bold <em>and italic</em> text</strong>');
        });

        it('should render empty formatting elements', () => {
            assert.strictEqual(renderMarkdown({ type: 'emphasis', children: [] }), '<em></em>');
            assert.strictEqual(renderMarkdown({ type: 'strong', children: [] }), '<strong></strong>');
            assert.strictEqual(renderMarkdown({ type: 'strikethrough', children: [] }), '<del></del>');
        });

        it('should escape HTML in formatting elements', () => {
            const ast = {
                type: 'emphasis',
                children: [T('<script>')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<em>&lt;script&gt;</em>');
        });
    });

    describe('Links', () => {
        it('should render basic link', () => {
            const ast = {
                type: 'link',
                url: 'https://example.com',
                children: [T('Example')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<a href="https://example.com">Example</a>');
        });

        it('should render link with title', () => {
            const ast = {
                type: 'link',
                url: 'https://example.com',
                title: 'Example Website',
                children: [T('Example')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<a href="https://example.com" title="Example Website">Example</a>');
        });

        it('should render link without title attribute when title is empty', () => {
            const ast = {
                type: 'link',
                url: 'https://example.com',
                title: '',
                children: [T('Example')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<a href="https://example.com">Example</a>');
        });

        it('should escape URL and title attributes', () => {
            const ast = {
                type: 'link',
                url: 'https://example.com?q="search"&x=<test>',
                title: 'Title with "quotes" & <tags>',
                children: [T('Link')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<a href="https://example.com?q=&quot;search&quot;&amp;x=&lt;test&gt;" title="Title with &quot;quotes&quot; &amp; &lt;tags&gt;">Link</a>');
        });

        it('should render link with formatted content', () => {
            const ast = {
                type: 'link',
                url: 'https://example.com',
                children: [
                    T('Visit '),
                    { type: 'strong', children: [T('Example')] },
                    T(' site')
                ]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<a href="https://example.com">Visit <strong>Example</strong> site</a>');
        });

        it('should render empty link', () => {
            const ast = {
                type: 'link',
                url: 'https://example.com',
                children: []
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<a href="https://example.com"></a>');
        });
    });

    describe('Images', () => {
        it('should render basic image', () => {
            const ast = {
                type: 'image',
                src: 'image.jpg',
                alt: 'Alt text'
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<img src="image.jpg" alt="Alt text">');
        });

        it('should render image with title', () => {
            const ast = {
                type: 'image',
                src: 'image.jpg',
                alt: 'Alt text',
                title: 'Image title'
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<img src="image.jpg" alt="Alt text" title="Image title">');
        });

        it('should render image without title attribute when title is empty', () => {
            const ast = {
                type: 'image',
                src: 'image.jpg',
                alt: 'Alt text',
                title: ''
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<img src="image.jpg" alt="Alt text">');
        });

        it('should escape src, alt, and title attributes', () => {
            const ast = {
                type: 'image',
                src: 'path/to/image.jpg?v="1"&t=<test>',
                alt: 'Alt with "quotes" & <tags>',
                title: 'Title with "quotes" & <tags>'
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<img src="path/to/image.jpg?v=&quot;1&quot;&amp;t=&lt;test&gt;" alt="Alt with &quot;quotes&quot; &amp; &lt;tags&gt;" title="Title with &quot;quotes&quot; &amp; &lt;tags&gt;">');
        });

        it('should handle empty alt text', () => {
            const ast = {
                type: 'image',
                src: 'image.jpg',
                alt: ''
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<img src="image.jpg" alt="">');
        });
    });

    describe('Lists', () => {
        it('should render unordered list', () => {
            const ast = {
                type: 'list',
                children: [
                    { type: 'list-item', children: [T('Item 1')] },
                    { type: 'list-item', children: [T('Item 2')] }
                ]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<ul><li>Item 1</li><li>Item 2</li></ul>');
        });

        it('should render ordered list', () => {
            const ast = {
                type: 'ordered-list',
                children: [
                    { type: 'ordered-list-item', children: [T('First')] },
                    { type: 'ordered-list-item', children: [T('Second')] }
                ]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<ol><li>First</li><li>Second</li></ol>');
        });

        it('should render list items with formatted content', () => {
            const ast = {
                type: 'list',
                children: [
                    {
                        type: 'list-item',
                        children: [
                            T('Item with '),
                            { type: 'strong', children: [T('bold')] },
                            T(' text')
                        ]
                    }
                ]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<ul><li>Item with <strong>bold</strong> text</li></ul>');
        });

        it('should render empty lists', () => {
            assert.strictEqual(renderMarkdown({ type: 'list', children: [] }), '<ul></ul>');
            assert.strictEqual(renderMarkdown({ type: 'ordered-list', children: [] }), '<ol></ol>');
        });

        it('should render empty list items', () => {
            const ast = {
                type: 'list',
                children: [
                    { type: 'list-item', children: [] }
                ]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<ul><li></li></ul>');
        });

        it('should escape HTML in list items', () => {
            const ast = {
                type: 'list',
                children: [
                    { type: 'list-item', children: [T('<script>alert("xss")</script>')] }
                ]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<ul><li>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</li></ul>');
        });
    });

    describe('Blockquotes', () => {
        it('should render blockquote', () => {
            const ast = {
                type: 'quote',
                children: [T('This is a quote')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<blockquote><p>This is a quote</p></blockquote>');
        });

        it('should render blockquote with formatted content', () => {
            const ast = {
                type: 'quote',
                children: [
                    T('Quote with '),
                    { type: 'emphasis', children: [T('emphasis')] }
                ]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<blockquote><p>Quote with <em>emphasis</em></p></blockquote>');
        });

        it('should render empty blockquote', () => {
            const ast = {
                type: 'quote',
                children: []
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<blockquote><p></p></blockquote>');
        });

        it('should escape HTML in blockquote', () => {
            const ast = {
                type: 'quote',
                children: [T('<script>alert("xss")</script>')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<blockquote><p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p></blockquote>');
        });
    });

    describe('Code', () => {
        it('should render inline code', () => {
            const ast = {
                type: 'code',
                value: 'console.log("hello")'
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<code>console.log(&quot;hello&quot;)</code>');
        });

        it('should render code block without language', () => {
            const ast = {
                type: 'code-block',
                value: 'function hello() {\n  console.log("Hello, world!");\n}'
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<pre><code>function hello() {\n  console.log(&quot;Hello, world!&quot;);\n}</code></pre>');
        });

        it('should render code block with language', () => {
            const ast = {
                type: 'code-block',
                language: 'javascript',
                value: 'console.log("Hello");'
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<pre><code class="language-javascript">console.log(&quot;Hello&quot;);</code></pre>');
        });

        it('should escape HTML in code', () => {
            const ast = {
                type: 'code',
                value: '<script>alert("xss")</script>'
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<code>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</code>');
        });

        it('should escape HTML in code block', () => {
            const ast = {
                type: 'code-block',
                value: '<script>alert("xss")</script>'
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<pre><code>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</code></pre>');
        });

        it('should escape language class attribute', () => {
            const ast = {
                type: 'code-block',
                language: 'java"script',
                value: 'console.log("test");'
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<pre><code class="language-java&quot;script">console.log(&quot;test&quot;);</code></pre>');
        });

        it('should handle empty code', () => {
            assert.strictEqual(renderMarkdown({ type: 'code', value: '' }), '<code></code>');
            assert.strictEqual(renderMarkdown({ type: 'code-block', value: '' }), '<pre><code></code></pre>');
        });
    });

    describe('Special Elements', () => {
        it('should render line breaks', () => {
            const ast = { type: 'line-break' };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<br>');
        });

        it('should render horizontal rules', () => {
            const ast = { type: 'horizontal-rule' };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<hr>');
        });

        it('should render div elements', () => {
            const ast = {
                type: 'div',
                children: [T('Content in div')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<div>Content in div</div>');
        });

        it('should render empty div', () => {
            const ast = {
                type: 'div',
                children: []
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<div></div>');
        });
    });

    describe('Complex Document Structure', () => {
        it('should render complex nested document', () => {
            const ast = {
                type: 'document',
                children: [
                    {
                        type: 'heading',
                        level: 1,
                        children: [T('Document Title')]
                    },
                    {
                        type: 'paragraph',
                        children: [
                            T('This is a paragraph with '),
                            { type: 'strong', children: [T('bold')] },
                            T(' and '),
                            { type: 'emphasis', children: [T('italic')] },
                            T(' text.')
                        ]
                    },
                    {
                        type: 'list',
                        children: [
                            { type: 'list-item', children: [T('First item')] },
                            { 
                                type: 'list-item', 
                                children: [
                                    T('Second item with '),
                                    { type: 'link', url: 'https://example.com', children: [T('link')] }
                                ]
                            }
                        ]
                    },
                    { type: 'horizontal-rule' },
                    {
                        type: 'quote',
                        children: [
                            T('A quote with '),
                            { type: 'code', value: 'inline code' }
                        ]
                    }
                ]
            };
            
            const expectedHtml = '<h1>Document Title</h1>' +
                               '<p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>' +
                               '<ul><li>First item</li><li>Second item with <a href="https://example.com">link</a></li></ul>' +
                               '<hr>' +
                               '<blockquote><p>A quote with <code>inline code</code></p></blockquote>';
            
            const html = renderMarkdown(ast);
            assert.strictEqual(html, expectedHtml);
        });

        it('should handle deeply nested formatting', () => {
            const ast = {
                type: 'paragraph',
                children: [
                    {
                        type: 'strong',
                        children: [
                            T('Bold text with '),
                            {
                                type: 'emphasis',
                                children: [
                                    T('italic and '),
                                    { type: 'strikethrough', children: [T('strikethrough')] }
                                ]
                            },
                            T(' formatting')
                        ]
                    }
                ]
            };
            
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<p><strong>Bold text with <em>italic and <del>strikethrough</del></em> formatting</strong></p>');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle nodes without children property', () => {
            const ast = { type: 'paragraph' };
            assert.throws(() => renderMarkdown(ast));
        });

        it('should handle nodes with null children', () => {
            const ast = { type: 'paragraph', children: null };
            assert.throws(() => renderMarkdown(ast));
        });

        it('should handle very large text content', () => {
            const largeText = 'a'.repeat(10000);
            const ast = T(largeText);
            const html = renderMarkdown(ast);
            assert.strictEqual(html, largeText);
        });

        it('should handle unicode characters', () => {
            const ast = T('Unicode: 🚀 ñáéíóú çñ 中文');
            const html = renderMarkdown(ast);
            assert.strictEqual(html, 'Unicode: 🚀 ñáéíóú çñ 中文');
        });

        it('should handle mixed content with all special characters', () => {
            const ast = {
                type: 'paragraph',
                children: [T('Mixed: &<>"\'')]
            };
            const html = renderMarkdown(ast);
            assert.strictEqual(html, '<p>Mixed: &amp;&lt;&gt;&quot;&#39;</p>');
        });
    });
}); 