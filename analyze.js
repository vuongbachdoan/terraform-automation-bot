import fs from 'fs/promises';
import chalk from 'chalk';
import { readTfFiles } from './utils/files.js';
import { refactorFile } from './refactor.js';

export async function analyzeAndRefactor(dir) {
    console.log(`🔍 Analyzing Terraform files in directory: ${dir}`);
    
    // Step 1: Read the files
    const files = await readTfFiles(dir);
    console.log(`Files read:`, files);

    if (files.length === 0) {
        console.log(chalk.red('No Terraform files found!'));
        return;
    }

    const prompt = "Can you refactor this Terraform code for readability, performance, and best practices? Respond with only the fixed code.";
    
    // Step 2: Refactor the files
    const results = await Promise.all(files.map(f => refactorFile(f, prompt)));
    console.log(`Refactor results:`, results);

    // Step 3: Create the report content
    let report = `# Terraform Refactor Report\n\n`;

    results.forEach(r => {
        if (r.suggestion) {
            console.log(chalk.green(`✔ Refactored: ${r.path}`));
            report += `## ${r.path}\n\n`;
            report += `\`\`\`hcl\n${r.suggestion}\n\`\`\`\n\n`;
        } else {
            console.log(chalk.red(`❌ Refactoring failed for: ${r.path}`));
            report += `## ${r.path}\n\nError during refactoring.\n\n`;
        }
    });

    // Step 4: Write the report to a file
    try {
        await fs.writeFile('refactor-report.md', report, 'utf8');
        console.log(chalk.blue('\n📄 Refactor report saved to refactor-report.md'));
    } catch (error) {
        console.error(chalk.red('Failed to save the refactor report:', error));
    }
}
