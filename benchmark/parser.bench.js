const { parseMarkdown } = require('../lib/parser');
const { performance } = require('perf_hooks');

function getTotalNodeCount(node) {
    if (!node) return 0;
    let count = 1;
    if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
            count += getTotalNodeCount(child);
        }
    }
    return count;
}

function getMaxAstDepth(node, currentDepth = 1) {
    if (!node || !node.children || !Array.isArray(node.children) || node.children.length === 0) {
        return currentDepth;
    }
    let maxDepth = currentDepth;
    for (const child of node.children) {
        maxDepth = Math.max(maxDepth, getMaxAstDepth(child, currentDepth + 1));
    }
    return maxDepth;
}

function generateParagraphHeavyMarkdown(numParagraphs) {
    let content = '';
    for (let i = 0; i < numParagraphs; i++) {
        content += `This is paragraph ${i + 1}. Some *italic stuff* and **bold text** here. Maybe ~~crossed out~~ content too. Testing \\*literal asterisks\\* and \\~literal tildes\\~.\n\n`;
    }
    return content;
}

function generateListHeavyMarkdown(numLists, depth, itemsPerLevel = 3) {
    let content = '';
    function generateListItems(currentDepth, listType = '-') {
        if (currentDepth > depth) return '';
        let items = '';
        const indent = '  '.repeat(currentDepth - 1);
        for (let i = 0; i < itemsPerLevel; i++) {
            const prefix = listType === '-' ? '-' : `${i + 1}.`;
            items += `${indent}${prefix} Item ${i + 1} at level ${currentDepth}. Some *emphasis* and **bold stuff**. With \\*escaped content\\* sometimes.\n`;
            if (currentDepth < depth) {
                items += generateListItems(currentDepth + 1, listType === '-' ? '-' : '1.');
            }
        }
        return items;
    }

    for (let i = 0; i < numLists; i++) {
        content += `List ${i + 1}:\n`;
        content += generateListItems(1, '-');
        content += '\n';
        content += `Ordered List ${i + 1}:\n`;
        content += generateListItems(1, '1.');
        content += '\n';
    }
    return content;
}

function generateBlockHeavyMarkdown(numBlocks) {
    let content = '';
    for (let i = 0; i < numBlocks; i++) {
        content += `# Heading 1 - Block ${i}\n`;
        content += `Some intro text for block ${i}. Check out [this link](http://example.com/block${i}).\n\n`;
        content += `> This is a quote in block ${i}.\n`;
        content += `> It has *italic* and **bold** text. Also \\~escaped stuff\\~.\n\n`;
        content += `## Heading 2 - Block ${i}\n`;
        content += `Text before the list.\n- First list item\n- Second item with *emphasis*\n\n`;
        content += `1. First numbered item\n2. Second numbered item with **bold text**\n\n`;
    }
    return content;
}

function generateInlineHeavyMarkdown(numLines, inlineElementsPerLine = 10) {
    let content = '';
    const inlineSamples = [
        '*italic*', '**bold**', '~~strike~~',
        '*more italic*', '**more bold**', '~~more strike~~',
        'plain text here',
        '[link](http://example.com/test)',
        '\\*literal asterisk\\*', '\\~\\~literal tildes\\~\\~',
        '***bold italic***',
        '**bold *italic nested* bold**',
        '*italic **bold nested** italic*',
        'Four asterisks **** literal',
        'Unmatched *italic',
        'Unmatched **bold',
        'Text with `code` (literal for now)',
    ];
    for (let i = 0; i < numLines; i++) {
        let line = `Line ${i}: `;
        for (let j = 0; j < inlineElementsPerLine; j++) {
            line += inlineSamples[Math.floor(Math.random() * inlineSamples.length)] + ' ';
        }
        content += line.trim() + '\n';
    }
    return content;
}

function generateMixedMarkdown(numSections) {
    let content = '';
    for (let i = 0; i < numSections; i++) {
        content += `# Section ${i + 1} Title\n\n`;
        content += generateParagraphHeavyMarkdown(1);
        content += `## Subsection ${i + 1}.1 - Lists\n`;
        content += generateListHeavyMarkdown(1, 2, 2);
        content += `### Subsection ${i + 1}.1.1 - Inline Focus\n`;
        content += generateInlineHeavyMarkdown(2, 4);
        content += `> Quote for section ${i + 1}. This has *emphasis* and **bold** text. Plus a [link](http://example.com/mixed${i}).\n\n`;
        content += generateBlockHeavyMarkdown(1);
    }
    return content;
}

function generateSingleLongParagraphMarkdown(numWords) {
    const words = ["Lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "test", "data", "sample", "content", "here", "some", "random", "words", "for", "testing", "purposes", "foo", "bar", "baz", "stuff", "things", "*italic*", "**bold**", "~~strike~~", "\\[escaped]", "\\(parens\\)"];
    let paragraph = '';
    for (let i = 0; i < numWords; i++) {
        paragraph += words[Math.floor(Math.random() * words.length)] + ' ';
    }
    return paragraph.trim() + '\n';
}

function runBenchmark(markdown, testName, iterations = 10) {
    console.log(`\n--- Benchmarking: ${testName} ---`);
    const lineCount = markdown.split('\n').length;
    console.log(`  Input: ${markdown.length} chars, ${lineCount} lines`);

    let totalTime = 0;
    let ast;

    if (iterations > 1) {
        parseMarkdown(markdown);
    }

    for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        ast = parseMarkdown(markdown);
        const endTime = performance.now();
        totalTime += (endTime - startTime);
    }

    const averageTime = totalTime / iterations;
    const totalNodes = getTotalNodeCount(ast);
    const maxDepth = getMaxAstDepth(ast);

    console.log(`  Average: ${averageTime.toFixed(3)} ms (${iterations} runs)`);
    console.log(`  Total: ${totalTime.toFixed(3)} ms`);
    console.log(`  Root children: ${ast ? ast.children.length : 'N/A'}`);
    console.log(`  Total nodes: ${totalNodes}, Max depth: ${maxDepth}`);
    console.log(`--- Done: ${testName} ---\n`);
    return { averageTime, totalTime, totalNodes, maxDepth, astTopLevelChildren: ast ? ast.children.length : 0 };
}

const BENCH_ITERATIONS = 5;

const scenarios = [
    { name: "Lots of paragraphs (200)", generator: generateParagraphHeavyMarkdown, args: [200] },
    { name: "Nested lists (5 lists, 3 levels deep)", generator: generateListHeavyMarkdown, args: [5, 3, 3] },
    { name: "Block elements (50 blocks)", generator: generateBlockHeavyMarkdown, args: [50] },
    { name: "Inline stuff (100 lines, 10 per line)", generator: generateInlineHeavyMarkdown, args: [100, 10] },
    { name: "Mixed content (20 sections)", generator: generateMixedMarkdown, args: [20] },
    { name: "One huge paragraph (5000 words)", generator: generateSingleLongParagraphMarkdown, args: [5000] },
    { name: "Tiny input", generator: () => `# Hello\n*world* with \\*escape\\*`, args: [] },
    { name: "Large mixed content (50 sections)", generator: generateMixedMarkdown, args: [50] }
];

console.log("Running markdown parser benchmarks...");
console.log(`Each test runs ${BENCH_ITERATIONS} times for averaging.\n`);

scenarios.forEach(scenario => {
    const markdownContent = scenario.generator(...scenario.args);
    runBenchmark(markdownContent, scenario.name, BENCH_ITERATIONS);
});

console.log("Done with all benchmarks.");