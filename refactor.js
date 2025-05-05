import { exec } from 'child_process';
import fs from 'fs/promises';
import { platform } from 'os';

// Check if `q` CLI is installed
function checkQInstalled() {
    const checkCommand = platform() === 'win32' ? 'where q' : 'which q';
    return new Promise((resolve, reject) => {
        exec(checkCommand, (err, stdout) => {
            if (err || !stdout.trim()) {
                reject(new Error(`Amazon Q CLI ('q') is not installed or not in PATH. Install it from https://docs.aws.amazon.com/q/developer/latest/userguide/install-cli.html`));
            } else {
                resolve(true);
            }
        });
    });
}

// Function to interact with Amazon Q's chat feature
async function askAmazonQ(prompt, inputCode) {
    await checkQInstalled();

    return new Promise((resolve, reject) => {
        const fullPrompt = `${prompt}\n\n${inputCode}`;

        const child = exec('q chat', { timeout: 30000 }, (err, stdout, stderr) => {
            if (err) {
                console.error(`Error executing q chat: ${stderr || err.message}`);
                reject(new Error(`Failed to run 'q chat': ${stderr || err.message}`));
            } else {
                resolve(stdout.trim());
            }
        });

        // Safely write prompt to stdin
        child.stdin.write(fullPrompt);
        child.stdin.end();
    });
}

// Refactor file based on the given prompt and return the refactored suggestion
async function refactorFile(file, prompt) {
    try {
        if (
            !file ||
            typeof file.content !== 'string' ||
            typeof file.path !== 'string'
        ) {
            throw new Error('Invalid file structure: path and content must be defined.');
        }

        console.log(`Refactoring file: ${file.path}`);
        const suggestion = await askAmazonQ(prompt, file.content);

        console.log(`Refactored suggestion for ${file.path}: ${suggestion}`);

        return {
            ...file,
            suggestion,
        };
    } catch (error) {
        console.error(`Error refactoring file ${file?.path || 'unknown'}: ${error.message}`);
        return {
            ...file,
            suggestion: `Error during refactoring: ${error.message}`,
        };
    }
}

export { refactorFile };
