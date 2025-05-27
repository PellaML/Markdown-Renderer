import { describe, it, expect } from "bun:test";

const assert = require('assert');
const { parseMarkdown } = require('../lib/parser');

const T = (value) => ({ type: 'text', value: String(value) });

describe('Markdown Parser Tests', () => {

    describe('Basic Structure and Empty Inputs', () => {
        it('should parse empty string as empty document', () => {
            const ast = parseMarkdown('');
            assert.deepStrictEqual(ast, { type: 'document', children: [] });
        });

        it('should parse newlines-only as empty document', () => {
            assert.deepStrictEqual(parseMarkdown('\n').children.length, 0, "Single newline");
            assert.deepStrictEqual(parseMarkdown('\n\n').children.length, 0, "Two newlines");
            assert.deepStrictEqual(parseMarkdown('  \n \n  \n').children.length, 0, "Spaces and newlines, all trim to empty");
        });

        it('should parse spaces-only as paragraph with spaces', () => {
            const ast = parseMarkdown('   ');
            assert.deepStrictEqual(ast.children[0], {
                type: 'paragraph',
                children: [T('   ')]
            });
        });

        it('should parse simple paragraph', () => {
            const ast = parseMarkdown('Hello world');
            assert.deepStrictEqual(ast.children[0], {
                type: 'paragraph',
                children: [T('Hello world')]
            });
        });

        it('should handle multiple paragraphs with newlines', () => {
            const ast1 = parseMarkdown('Para 1\n\nPara 2');
            assert.strictEqual(ast1.children.length, 3, "P1, LB, P2");
            assert.strictEqual(ast1.children[0].type, 'paragraph');
            assert.deepStrictEqual(ast1.children[0].children, [T('Para 1')]);
            assert.strictEqual(ast1.children[1].type, 'line-break');
            assert.strictEqual(ast1.children[2].type, 'paragraph');
            assert.deepStrictEqual(ast1.children[2].children, [T('Para 2')]);

            const ast2 = parseMarkdown('Para A\n\n\nPara B');
            assert.strictEqual(ast2.children.length, 4, "PA, LB, LB, PB");
            assert.strictEqual(ast2.children[0].type, 'paragraph');
            assert.deepStrictEqual(ast2.children[0].children, [T('Para A')]);
            assert.strictEqual(ast2.children[1].type, 'line-break');
            assert.strictEqual(ast2.children[2].type, 'line-break');
            assert.strictEqual(ast2.children[3].type, 'paragraph');
            assert.deepStrictEqual(ast2.children[3].children, [T('Para B')]);
        });
    });

    describe('Headings', () => {
        for (let level = 1; level <= 6; level++) {
            it(`should parse heading H${level}`, () => {
                const markdown = `${'#'.repeat(level)} Heading ${level}`;
                const ast = parseMarkdown(markdown);
                assert.deepStrictEqual(ast.children[0], {
                    type: 'heading',
                    level: level,
                    children: [T(`Heading ${level}`)]
                });
            });
        }

        it('should parse heading with spaces in content', () => {
            const ast = parseMarkdown('##  Spaced Heading  ');
            assert.deepStrictEqual(ast.children[0], {
                type: 'heading',
                level: 2,
                children: [T(' Spaced Heading  ')]
            });
        });

        it('should treat # without space as paragraph', () => {
            const ast = parseMarkdown('#NoSpace');
            assert.deepStrictEqual(ast.children[0], {
                type: 'paragraph',
                children: [T('#NoSpace')]
            });
        });
    });

    describe('Inline Formatting', () => {
        it('should parse emphasis (*italic*)', () => {
            const ast = parseMarkdown('Text *italic* text.');
            assert.deepStrictEqual(ast.children[0].children, [
                T('Text '), { type: 'emphasis', children: [T('italic')] }, T(' text.')
            ]);
        });

        it('should parse strong (**bold**)', () => {
            const ast = parseMarkdown('Text **bold** text.');
            assert.deepStrictEqual(ast.children[0].children, [
                T('Text '), { type: 'strong', children: [T('bold')] }, T(' text.')
            ]);
        });

        it('should parse strikethrough (~~strike~~)', () => {
            const ast = parseMarkdown('Text ~~strike~~ text.');
            assert.deepStrictEqual(ast.children[0].children, [
                T('Text '), { type: 'strikethrough', children: [T('strike')] }, T(' text.')
            ]);
        });

        it('should handle mixed inline formatting', () => {
            const ast = parseMarkdown('This is **bold** and *italic* and ~~strike~~.');
            assert.deepStrictEqual(ast.children[0].children, [
                T('This is '), { type: 'strong', children: [T('bold')] },
                T(' and '), { type: 'emphasis', children: [T('italic')] },
                T(' and '), { type: 'strikethrough', children: [T('strike')] }, T('.')
            ]);
        });

        it('should handle consecutive different inline formattings', () => {
            const ast = parseMarkdown('*italic***bold**~~strike~~');
            assert.deepStrictEqual(ast.children[0].children, [
                { type: 'emphasis', children: [T('italic')] },
                { type: 'strong', children: [T('bold')] },
                { type: 'strikethrough', children: [T('strike')] }
            ]);
        });

        it('should handle formatting at the beginning/end of a line', () => {
            const astStart = parseMarkdown('**Bold** start');
            assert.deepStrictEqual(astStart.children[0].children,
                [{ type: 'strong', children: [T('Bold')] }, T(' start')]
            );
            const astEnd = parseMarkdown('End *italic*');
            assert.deepStrictEqual(astEnd.children[0].children,
                [T('End '), { type: 'emphasis', children: [T('italic')] }]
            );
        });

        describe('Inline Formatting Edge Cases & Unmatched/Empty', () => {
            it('should treat unclosed formatting as literal text', () => {
                assert.deepStrictEqual(parseMarkdown('This is *italic').children[0].children, [T('This is *italic')]);
                assert.deepStrictEqual(parseMarkdown('This is **bold').children[0].children, [T('This is **bold')]);
                assert.deepStrictEqual(parseMarkdown('This is ~~strike').children[0].children, [T('This is ~~strike')]);
                assert.deepStrictEqual(parseMarkdown('*').children[0].children, [T('*')]);
                assert.deepStrictEqual(parseMarkdown('**').children[0].children, [T('**')]);
                assert.deepStrictEqual(parseMarkdown('~~').children[0].children, [T('~~')]);
            });

            it('should treat empty formatting as literal text', () => {
                assert.deepStrictEqual(parseMarkdown('Text **** and ** and * and ~~').children[0].children, [T('Text **** and ** and * and ~~')]);
            });

            it('should parse formatting with spaces as content', () => {
                assert.deepStrictEqual(parseMarkdown('Em * * phasis').children[0].children, [
                    T('Em '), { type: 'emphasis', children: [T(' ')] }, T(' phasis')
                ]);
                assert.deepStrictEqual(parseMarkdown('Str ** ** ong').children[0].children, [
                    T('Str '), { type: 'strong', children: [T(' ')] }, T(' ong')
                ]);
                assert.deepStrictEqual(parseMarkdown('Del ~~ ~~ ete').children[0].children, [
                    T('Del '), { type: 'strikethrough', children: [T(' ')] }, T(' ete')
                ]);
            });

            it('should handle literal "****" due to parser rules', () => {
                assert.deepStrictEqual(parseMarkdown('A****B').children[0].children, [T('A****B')]);
                assert.deepStrictEqual(parseMarkdown('****').children[0].children, [T('****')]);
            });

            it('should handle "****" interactions with bold/italic', () => {
                assert.deepStrictEqual(parseMarkdown('****bold**').children[0].children, [T('****bold**')]);
                assert.deepStrictEqual(parseMarkdown('**bold****').children[0].children, [
                    { type: 'strong', children: [T('bold')] },
                    T('**')
                ]);
                assert.deepStrictEqual(parseMarkdown('****bold****').children[0].children, [T('****bold****')]);
            });

            it('should handle "***text***" as strong(emphasis(text))', () => {
                const ast = parseMarkdown('***text***');
                assert.deepStrictEqual(ast.children[0].children[0], {
                    type: 'strong',
                    children: [{ type: 'emphasis', children: [T('text')] }]
                });
            });

            it('should handle nested formatting like **bold *italic* bold**', () => {
                assert.deepStrictEqual(parseMarkdown('**bold *italic* bold**').children[0].children[0], {
                    type: 'strong',
                    children: [T('bold '), { type: 'emphasis', children: [T('italic')] }, T(' bold')]
                });
            });

            it('should handle nested formatting like *italic **bold** italic*', () => {
                assert.deepStrictEqual(parseMarkdown('*italic **bold** italic*').children[0].children[0], {
                    type: 'emphasis',
                    children: [T('italic '), { type: 'strong', children: [T('bold')] }, T(' italic')]
                });
            });

            it('should handle emphasis/strong within words', () => {
                assert.deepStrictEqual(parseMarkdown('wo*rd*le').children[0].children,
                    [T('wo'), { type: 'emphasis', children: [T('rd')] }, T('le')]
                );
                assert.deepStrictEqual(parseMarkdown('wo**rd**le').children[0].children,
                    [T('wo'), { type: 'strong', children: [T('rd')] }, T('le')]
                );
            });
        });
    });

    describe('Lists', () => {
        it('should parse unordered lists', () => {
            const ast = parseMarkdown('- Item 1\n- Item 2');
            assert.deepStrictEqual(ast.children[0], {
                type: 'list',
                children: [
                    { type: 'list-item', children: [T('Item 1')] },
                    { type: 'list-item', children: [T('Item 2')] }
                ]
            });
        });

        it('should parse ordered lists', () => {
            const ast = parseMarkdown('1. First\n2. Second');
            assert.deepStrictEqual(ast.children[0], {
                type: 'ordered-list',
                children: [
                    { type: 'ordered-list-item', children: [T('First')] },
                    { type: 'ordered-list-item', children: [T('Second')] }
                ]
            });
        });

        it('should handle list items with spacing around marker', () => {
            assert.deepStrictEqual(parseMarkdown('-   Item A').children[0].children[0].children, [T('  Item A')]);
            assert.deepStrictEqual(parseMarkdown('1.   Item B').children[0].children[0].children, [T('  Item B')]);
        });

        it('should parse indented lists as flat list items', () => {
            const md = "- Parent\n  - Child 1\n  - Child 2";
            const ast = parseMarkdown(md);
            assert.deepStrictEqual(ast.children[0], {
                type: 'list',
                children: [
                    { type: 'list-item', children: [T('Parent')] },
                    { type: 'list-item', children: [T('Child 1')] },
                    { type: 'list-item', children: [T('Child 2')] }
                ]
            });
        });

        it('should create separate lists for different types', () => {
            const ast = parseMarkdown('- Unordered\n1. Ordered\n- Another Unordered');
            assert.strictEqual(ast.children.length, 3);
            assert.strictEqual(ast.children[0].type, 'list');
            assert.strictEqual(ast.children[1].type, 'ordered-list');
            assert.strictEqual(ast.children[2].type, 'list');
        });
    });

    describe('Blockquotes', () => {
        it('should parse simple blockquotes', () => {
            const ast = parseMarkdown('> This is a quote.');
            assert.deepStrictEqual(ast.children[0], {
                type: 'quote',
                children: [T('This is a quote.')]
            });
        });

        it('should parse multiple blockquote lines as separate quotes', () => {
            const ast = parseMarkdown('> Line 1\n> Line 2');
            assert.strictEqual(ast.children.length, 2);
            assert.deepStrictEqual(ast.children[0], { type: 'quote', children: [T('Line 1')] });
            assert.deepStrictEqual(ast.children[1], { type: 'quote', children: [T('Line 2')] });
        });

        it('should parse blockquote with inline formatting', () => {
            const ast = parseMarkdown('> This is *italic* and **bold**.');
            assert.deepStrictEqual(ast.children[0], {
                type: 'quote',
                children: [
                    T('This is '), { type: 'emphasis', children: [T('italic')] },
                    T(' and '), { type: 'strong', children: [T('bold')] }, T('.')
                ]
            });
        });

        it('Blockquote followed by paragraph', () => {
            const ast = parseMarkdown("> A quote.\n\nA paragraph.");
            assert.strictEqual(ast.children.length, 3);
            assert.strictEqual(ast.children[0].type, "quote");
            assert.strictEqual(ast.children[1].type, "line-break");
            assert.strictEqual(ast.children[2].type, "paragraph");
        });
    });

    describe('Links (Block-Level Only)', () => {
        it('should parse links on their own line as block-level nodes', () => {
            const ast = parseMarkdown('[Example](http://example.com)');
            assert.deepStrictEqual(ast.children[0], {
                type: 'link',
                url: 'http://example.com',
                children: [T('Example')]
            });
        });

        it('should treat link syntax in paragraphs as literal text', () => {
            const ast = parseMarkdown('Text with a [link](url).');
            assert.deepStrictEqual(ast.children[0], {
                type: 'paragraph',
                children: [
                    T('Text with a '),
                    { type: 'link', url: 'url', children: [T('link')] },
                    T('.')
                ]
            });
        });
    });

    describe('Escaping (Proper Escaping)', () => {
        it('should properly escape formatting characters', () => {
            const ast = parseMarkdown('This is \\*not italic\\* and \\~\\~not strike\\~\\~');
            assert.deepStrictEqual(ast.children[0].children, [T('This is *not italic* and ~~not strike~~')]);
        });

        it('should properly escape link syntax characters', () => {
            const ast = parseMarkdown('\\[not a link\\](\\(not a url\\))');
            assert.deepStrictEqual(ast.children[0].children, [T('[not a link]((not a url))')]);
        });

        it('should escape backslashes themselves', () => {
            const ast = parseMarkdown('This is a literal backslash: \\\\');
            assert.deepStrictEqual(ast.children[0].children, [T('This is a literal backslash: \\')]);
        });

        it('should escape backticks to prevent code formatting', () => {
            const ast = parseMarkdown('Use \\`backticks\\` without code formatting');
            assert.deepStrictEqual(ast.children[0].children, [T('Use `backticks` without code formatting')]);
        });

        it('should handle multiple consecutive escapes', () => {
            const ast = parseMarkdown('\\*\\*not bold\\*\\* and \\`not code\\`');
            assert.deepStrictEqual(ast.children[0].children, [T('**not bold** and `not code`')]);
        });

        it('should treat invalid escape sequences as literal text', () => {
            const ast = parseMarkdown('Invalid escape: \\z and \\1 and \\space');
            assert.deepStrictEqual(ast.children[0].children, [T('Invalid escape: \\z and \\1 and \\space')]);
        });

        it('should escape in headings', () => {
            const ast = parseMarkdown('# Heading with \\*escaped\\* asterisks');
            assert.deepStrictEqual(ast.children[0], {
                type: 'heading',
                level: 1,
                children: [T('Heading with *escaped* asterisks')]
            });
        });

        it('should escape in blockquotes', () => {
            const ast = parseMarkdown('> Quote with \\*escaped\\* formatting');
            assert.deepStrictEqual(ast.children[0], {
                type: 'quote',
                children: [T('Quote with *escaped* formatting')]
            });
        });

        it('should escape in list items', () => {
            const ast = parseMarkdown('- List item with \\*escaped\\* asterisks');
            assert.deepStrictEqual(ast.children[0].children[0].children, [T('List item with *escaped* asterisks')]);
        });

        it('should escape hash symbols to prevent heading interpretation', () => {
            const ast = parseMarkdown('\\# Not a heading');
            assert.deepStrictEqual(ast.children[0].children, [T('# Not a heading')]);
        });

        it('should escape greater than to prevent blockquote interpretation', () => {
            const ast = parseMarkdown('\\> Not a blockquote');
            assert.deepStrictEqual(ast.children[0].children, [T('> Not a blockquote')]);
        });

        it('should escape hyphen to prevent list interpretation', () => {
            const ast = parseMarkdown('\\- Not a list item');
            assert.deepStrictEqual(ast.children[0].children, [T('- Not a list item')]);
        });

        it('should handle escape at end of text', () => {
            const ast = parseMarkdown('Text ending with escape\\*');
            assert.deepStrictEqual(ast.children[0].children, [T('Text ending with escape*')]);
        });

        it('should handle escape at end of input without following character', () => {
            const ast = parseMarkdown('Text ending with backslash\\');
            assert.deepStrictEqual(ast.children[0].children, [T('Text ending with backslash\\')]);
        });

        it('should escape all punctuation characters per CommonMark', () => {
            const escapableChars = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
            const input = escapableChars.split('').map(char => `\\${char}`).join('');
            const expected = escapableChars;
            const ast = parseMarkdown(input);
            assert.deepStrictEqual(ast.children[0].children, [T(expected)]);
        });
    });

    describe('Miscellaneous and Interactions', () => {
        it('should ignore unknown markdown syntax as text', () => {
            const ast = parseMarkdown('Text with ^^^ unknown ^^^ symbols.');
            assert.deepStrictEqual(ast.children[0].children, [T('Text with ^^^ unknown ^^^ symbols.')]);
        });

        it('should correctly parse "how are you? *test*"', () => {
            const ast = parseMarkdown('how are you? *test*');
            assert.deepStrictEqual(ast.children[0].children, [
                T('how are you? '), { type: 'emphasis', children: [T('test')] }
            ]);
        });

        it('should correctly parse "*test* test **test**"', () => {
            const ast = parseMarkdown('*test* test **test**');
            assert.deepStrictEqual(ast.children[0].children, [
                { type: 'emphasis', children: [T('test')] }, T(' test '), { type: 'strong', children: [T('test')] }
            ]);
        });

        it('paragraph followed by a list', () => {
            const md = "This is a paragraph.\n- List item 1\n- List item 2";
            const ast = parseMarkdown(md);
            assert.strictEqual(ast.children.length, 2);
            assert.strictEqual(ast.children[0].type, 'paragraph');
            assert.deepStrictEqual(ast.children[0].children, [T('This is a paragraph.')]);
            assert.strictEqual(ast.children[1].type, 'list');
            assert.strictEqual(ast.children[1].children.length, 2);
        });

        it('heading followed by list then paragraph', () => {
            const md = "# Title\n- Item A\n\nAnother paragraph.";
            const ast = parseMarkdown(md);
            assert.strictEqual(ast.children.length, 4);
            assert.strictEqual(ast.children[0].type, 'heading');
            assert.strictEqual(ast.children[1].type, 'list');
            assert.strictEqual(ast.children[2].type, 'line-break');
            assert.strictEqual(ast.children[3].type, 'paragraph');
        });
    });

    describe('Inline Code', () => {
        it('should parse inline code with backticks', () => {
            const ast = parseMarkdown('This is `inline code` in text.');
            assert.deepStrictEqual(ast.children[0].children, [
                T('This is '),
                { type: 'code', value: 'inline code' },
                T(' in text.')
            ]);
        });

        it('should parse multiple inline code spans', () => {
            const ast = parseMarkdown('Use `console.log()` and `alert()` functions.');
            assert.deepStrictEqual(ast.children[0].children, [
                T('Use '),
                { type: 'code', value: 'console.log()' },
                T(' and '),
                { type: 'code', value: 'alert()' },
                T(' functions.')
            ]);
        });

        it('should handle inline code at start and end of line', () => {
            const ast = parseMarkdown('`start` middle `end`');
            assert.deepStrictEqual(ast.children[0].children, [
                { type: 'code', value: 'start' },
                T(' middle '),
                { type: 'code', value: 'end' }
            ]);
        });

        it('should preserve spaces and special chars in inline code', () => {
            const ast = parseMarkdown('Code: `  special **chars** & symbols  `');
            assert.deepStrictEqual(ast.children[0].children, [
                T('Code: '),
                { type: 'code', value: '  special **chars** & symbols  ' }
            ]);
        });

        it('should treat unmatched backticks as literal text', () => {
            const ast = parseMarkdown('This `is incomplete');
            assert.deepStrictEqual(ast.children[0].children, [
                T('This `is incomplete')
            ]);
        });

        it('should handle empty inline code', () => {
            const ast = parseMarkdown('Empty: `` and text');
            assert.deepStrictEqual(ast.children[0].children, [
                T('Empty: '),
                { type: 'code', value: '' },
                T(' and text')
            ]);
        });

        it('should handle inline code with backticks inside (using multiple backticks)', () => {
            const ast = parseMarkdown('Code: `` `backtick` inside ``');
            assert.deepStrictEqual(ast.children[0].children, [
                T('Code: '),
                { type: 'code', value: '`backtick` inside' }
            ]);
        });
    });

    describe('Fenced Code Blocks', () => {
        it('should parse basic fenced code block with backticks', () => {
            const markdown = '```\nfunction hello() {\n  console.log("world");\n}\n```';
            const ast = parseMarkdown(markdown);
            assert.deepStrictEqual(ast.children[0], {
                type: 'code-block',
                language: null,
                value: 'function hello() {\n  console.log("world");\n}'
            });
        });

        it('should parse fenced code block with language', () => {
            const markdown = '```javascript\nfunction hello() {\n  console.log("world");\n}\n```';
            const ast = parseMarkdown(markdown);
            assert.deepStrictEqual(ast.children[0], {
                type: 'code-block',
                language: 'javascript',
                value: 'function hello() {\n  console.log("world");\n}'
            });
        });

        it('should parse fenced code block with tildes', () => {
            const markdown = '~~~python\ndef hello():\n    print("world")\n~~~';
            const ast = parseMarkdown(markdown);
            assert.deepStrictEqual(ast.children[0], {
                type: 'code-block',
                language: 'python',
                value: 'def hello():\n    print("world")'
            });
        });

        it('should handle empty code block', () => {
            const markdown = '```\n```';
            const ast = parseMarkdown(markdown);
            assert.deepStrictEqual(ast.children[0], {
                type: 'code-block',
                language: null,
                value: ''
            });
        });

        it('should preserve leading whitespace in code blocks', () => {
            const markdown = '```\n    indented code\n        more indented\n```';
            const ast = parseMarkdown(markdown);
            assert.deepStrictEqual(ast.children[0], {
                type: 'code-block',
                language: null,
                value: '    indented code\n        more indented'
            });
        });

        it('should handle unclosed code block as paragraph', () => {
            const markdown = '```javascript\nfunction hello() {';
            const ast = parseMarkdown(markdown);
            assert.deepStrictEqual(ast.children[0].type, 'paragraph');
        });

        it('should handle code block with content after language', () => {
            const markdown = '```js title="example.js"\nconst x = 1;\n```';
            const ast = parseMarkdown(markdown);
            assert.deepStrictEqual(ast.children[0], {
                type: 'code-block',
                language: 'js',
                meta: 'title="example.js"',
                value: 'const x = 1;'
            });
        });
    });

    describe('Images', () => {
        it('should parse basic image', () => {
            const ast = parseMarkdown('![Alt text](image.jpg)');
            assert.deepStrictEqual(ast.children[0], {
                type: 'image',
                alt: 'Alt text',
                src: 'image.jpg',
                title: null
            });
        });

        it('should parse image with title', () => {
            const ast = parseMarkdown('![Alt text](image.jpg "Image title")');
            assert.deepStrictEqual(ast.children[0], {
                type: 'image',
                alt: 'Alt text',
                src: 'image.jpg',
                title: 'Image title'
            });
        });

        it('should parse image with empty alt text', () => {
            const ast = parseMarkdown('![](image.jpg)');
            assert.deepStrictEqual(ast.children[0], {
                type: 'image',
                alt: '',
                src: 'image.jpg',
                title: null
            });
        });

        it('should parse inline image in paragraph', () => {
            const ast = parseMarkdown('Before ![alt](img.jpg) after.');
            assert.deepStrictEqual(ast.children[0].children, [
                T('Before '),
                { type: 'image', alt: 'alt', src: 'img.jpg', title: null },
                T(' after.')
            ]);
        });

        it('should treat malformed image syntax as text', () => {
            const ast = parseMarkdown('![Alt text(missing closing bracket');
            assert.deepStrictEqual(ast.children[0].children, [
                T('![Alt text(missing closing bracket')
            ]);
        });

        it('should parse image with complex URL', () => {
            const ast = parseMarkdown('![Test](https://example.com/path/image.png?query=1)');
            assert.deepStrictEqual(ast.children[0], {
                type: 'image',
                alt: 'Test',
                src: 'https://example.com/path/image.png?query=1',
                title: null
            });
        });
    });

    describe('Horizontal Rules', () => {
        it('should parse dashes horizontal rule', () => {
            const ast = parseMarkdown('---');
            assert.deepStrictEqual(ast.children[0], {
                type: 'horizontal-rule'
            });
        });

        it('should parse asterisks horizontal rule', () => {
            const ast = parseMarkdown('***');
            assert.deepStrictEqual(ast.children[0], {
                type: 'horizontal-rule'
            });
        });

        it('should parse underscores horizontal rule', () => {
            const ast = parseMarkdown('___');
            assert.deepStrictEqual(ast.children[0], {
                type: 'horizontal-rule'
            });
        });

        it('should parse horizontal rule with spaces', () => {
            const ast = parseMarkdown('- - -');
            assert.deepStrictEqual(ast.children[0], {
                type: 'horizontal-rule'
            });
        });

        it('should parse horizontal rule with many characters', () => {
            const ast = parseMarkdown('----------');
            assert.deepStrictEqual(ast.children[0], {
                type: 'horizontal-rule'
            });
        });

        it('should parse horizontal rule between content', () => {
            const ast = parseMarkdown('Content above\n\n---\n\nContent below');
            assert.strictEqual(ast.children.length, 5);
            assert.strictEqual(ast.children[0].type, 'paragraph');
            assert.strictEqual(ast.children[2].type, 'horizontal-rule');
            assert.strictEqual(ast.children[4].type, 'paragraph');
        });

        it('should not parse insufficient characters as horizontal rule', () => {
            const ast = parseMarkdown('--');
            assert.deepStrictEqual(ast.children[0].type, 'paragraph');
        });
    });

    describe('Inline Links', () => {
        it('should parse inline link in paragraph', () => {
            const ast = parseMarkdown('Check out [this link](http://example.com) in text.');
            assert.deepStrictEqual(ast.children[0].children, [
                T('Check out '),
                { type: 'link', url: 'http://example.com', children: [T('this link')] },
                T(' in text.')
            ]);
        });

        it('should parse multiple inline links', () => {
            const ast = parseMarkdown('Visit [site1](http://1.com) and [site2](http://2.com).');
            assert.deepStrictEqual(ast.children[0].children, [
                T('Visit '),
                { type: 'link', url: 'http://1.com', children: [T('site1')] },
                T(' and '),
                { type: 'link', url: 'http://2.com', children: [T('site2')] },
                T('.')
            ]);
        });

        it('should parse link with title', () => {
            const ast = parseMarkdown('A [link](http://example.com "Link title") with title.');
            assert.deepStrictEqual(ast.children[0].children, [
                T('A '),
                { type: 'link', url: 'http://example.com', title: 'Link title', children: [T('link')] },
                T(' with title.')
            ]);
        });

        it('should parse link with formatting in link text', () => {
            const ast = parseMarkdown('A [**bold** link](http://example.com) here.');
            assert.deepStrictEqual(ast.children[0].children, [
                T('A '),
                { 
                    type: 'link', 
                    url: 'http://example.com', 
                    children: [{ type: 'strong', children: [T('bold')] }, T(' link')]
                },
                T(' here.')
            ]);
        });

        it('should handle link at start and end of paragraph', () => {
            const ast = parseMarkdown('[Start](http://start.com) middle [end](http://end.com)');
            assert.deepStrictEqual(ast.children[0].children, [
                { type: 'link', url: 'http://start.com', children: [T('Start')] },
                T(' middle '),
                { type: 'link', url: 'http://end.com', children: [T('end')] }
            ]);
        });

        it('should treat malformed links as literal text', () => {
            const ast = parseMarkdown('This [incomplete link(missing bracket');
            assert.deepStrictEqual(ast.children[0].children, [
                T('This [incomplete link(missing bracket')
            ]);
        });

        it('should preserve existing block-level link behavior', () => {
            const ast = parseMarkdown('[Block Link](http://example.com)');
            assert.deepStrictEqual(ast.children[0], {
                type: 'link',
                url: 'http://example.com',
                children: [T('Block Link')]
            });
        });
    });
});