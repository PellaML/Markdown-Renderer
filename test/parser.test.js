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
                children: [T('Text with a [link](url).')]
            });
        });
    });

    describe('Escaping (Literal Backslashes)', () => {
        it('should treat backslashes as literal characters', () => {
            const ast = parseMarkdown('This is \\*not italic\\* and \\~\\~not strike\\~\\~');
            assert.deepStrictEqual(ast.children[0].children, [T('This is \\*not italic\\* and \\~\\~not strike\\~\\~')]);
        });

        it('should treat escaped link syntax as literal text', () => {
            const ast = parseMarkdown('\\[not a link\\](\\(not a url\\))');
            assert.deepStrictEqual(ast.children[0].children, [T('\\[not a link\\](\\(not a url\\))')]);
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
});