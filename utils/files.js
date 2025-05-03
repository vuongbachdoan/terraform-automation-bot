import fs from 'fs/promises';
import path from 'path';

export async function readTfFiles(dir) {
    try {
        const files = [];
        const filePaths = await fs.readdir(dir);
        
        // Log the directory and files found
        console.log(`Reading Terraform files from directory: ${dir}`);
        console.log(`Files found: ${filePaths}`);

        for (let filePath of filePaths) {
            const fullPath = path.join(dir, filePath);
            const stats = await fs.stat(fullPath);

            if (stats.isFile() && fullPath.endsWith('.tf')) {
                const content = await fs.readFile(fullPath, 'utf8');
                console.log(`Reading file: ${fullPath}`); // Log the file being read
                files.push({ path: fullPath, content });
            }
        }

        if (files.length === 0) {
            console.log('No Terraform files found in the directory.');
        }

        return files;
    } catch (error) {
        console.error(`Error reading files from ${dir}: ${error.message}`);
        return [];
    }
}
