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

// Safely escape input for shell
function shellEscape(str) {
    return str
        .replace(/(["$`\\])/g, '\\$1') // escape shell-sensitive characters
        .replace(/\n/g, '\\n'); // handle newlines
}

// Function to interact with Amazon Q's chat feature
async function askAmazonQ(prompt, inputCode) {
    await checkQInstalled();

    return new Promise((resolve, reject) => {
        const fullPrompt = `${prompt}\n\n${inputCode}`;
        const safePrompt = shellEscape(fullPrompt);

        exec(`echo "${safePrompt}" | q chat`, (err, stdout, stderr) => {
            if (err) {
                console.error(`Error executing q chat: ${stderr}`);
                reject(new Error(stderr));
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

// Refactor file based on the given prompt and return the refactored suggestion
async function refactorFile(file, prompt) {
    try {
        if (!file || !file.content) {
            throw new Error('File content is undefined or invalid');
        }

        console.log(`Refactoring file: ${file.path}`);
        const suggestion = await askAmazonQ(prompt, file.content);

        console.log(`Refactored suggestion for ${file.path}: ${suggestion}`);

        return {
            ...file,
            suggestion
        };
    } catch (error) {
        console.error(`Error refactoring file ${file.path}: ${error.message}`);
        return {
            ...file,
            suggestion: `Error during refactoring: ${error.message}`
        };
    }
}

export { refactorFile };
