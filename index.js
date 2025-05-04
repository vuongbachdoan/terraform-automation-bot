#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import prompts from "prompts";
import ora from "ora";
import { readTfFiles } from "./utils/files.js";
import { refactorFile } from "./refactor.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import figlet from "figlet";
import boxen from "boxen";
import os from "os";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Format changes with magenta as main color
function formatDiff(oldContent, newContent) {
  let diffOutput = "";
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diffOutput += chalk.gray("  " + oldLines[i]) + "\n";
      i++;
      j++;
    } else {
      if (i < oldLines.length) {
        diffOutput += chalk.hex("#80EF80")("- " + oldLines[i]) + "\n"; 
        i++;
      }
      if (j < newLines.length) {
        diffOutput += chalk.hex("#FFD580")("+ " + newLines[j]) + "\n"; 
        j++;
      }
    }
  }
  return diffOutput;
}

// CLI Greeting with magenta theme
function printGreeting() {
  const asciiArt = figlet.textSync("Terraform Assistant", {
    font: "Standard",
  });

  const username = os.userInfo().username;
  const hostname = os.hostname();
  const uptime = os.uptime();
  const memTotal = os.totalmem() / (1024 * 1024);
  const memFree = os.freemem() / (1024 * 1024);
  const memUsed = memTotal - memFree;
  const now = new Date();

  const greetingBox = boxen(
    [
      chalk.hex("#80EF80")(asciiArt),
      chalk.white.bold(`${username}@${hostname}`),
      "",
      chalk.hex("#80EF80")("Date: ") + chalk.white(now.toLocaleString("en-GB", { timeZoneName: "short" })) + " ",
      chalk.hex("#80EF80")("Optime: ") + `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m` + " ",
      chalk.hex("#80EF80")("RAM: ") + `${memUsed.toFixed(0)}MB used / ${memTotal.toFixed(0)}MB total` + " ",
      chalk.hex("#80EF80")("Working Directory: ") + chalk.white(process.cwd()) + " ",
      "",
      chalk.white("Terraform Assistant helps improve readability, performance & security!"),
    ].join("\n"),
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "magenta",
    }
  );

  console.log(greetingBox);
}

async function analyzeAndRefactor(dir) {
  console.log(chalk.hex("#80EF80")(`🔍 Analyzing Terraform files in directory: ${dir}`));
  const spinner = ora("Loading files...").start();
  const files = await readTfFiles(dir);
  spinner.succeed("Files loaded successfully");

  if (files.length === 0) {
    console.log(chalk.hex("#80EF80")("⚠️  No Terraform files found in the directory!"));
    return;
  }

  const prompt = "Can you refactor this Terraform code for readability, performance, and best practices? Respond with only the fixed code.";
  let changes = [];

  for (let file of files) {
    console.log(chalk.white.bold(`\n✨ Refactoring file: ${file.path}`));
    const fileSpinner = ora(`Refactoring ${file.path}`).start();
    const suggestion = await refactorFile(file, prompt);
    fileSpinner.succeed(`Refactor completed for ${file.path}`);

    const diff = formatDiff(file.content, suggestion.suggestion);
    changes.push({ file, diff, suggestion });

    const boxedDiff = boxen(diff, {
      padding: 1,
      margin: 1,
      borderStyle: "double",
      borderColor: "magenta",
      title: `Proposed changes in ${path.basename(file.path)}`,
      titleAlignment: "center",
    });

    console.log(boxedDiff);

    const confirm = await prompts({
      type: "select",
      name: "apply",
      message: chalk.hex("#80EF80")("Do you want to apply these changes?"),
      choices: [
        { title: chalk.green("✔ Yes, apply"), value: true },
        { title: chalk.red("✖ No, skip"), value: false },
      ],
      initial: 0,
    });

    if (confirm.apply) {
      file.content = suggestion.suggestion;
      console.log(chalk.green(`✔ Changes applied for ${file.path}`));
    } else {
      console.log(chalk.gray(`⏭️ Skipped ${file.path}`));
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(__dirname, "report", `refactor-report-${timestamp}.md`);
  let report = `# Terraform Refactor Report (${timestamp})\n\n`;

  changes.forEach((change) => {
    report += `## ${change.file.path}\n\n`;
    report += change.diff + "\n\n";
  });

  const savingSpinner = ora("Saving refactor report...").start();
  try {
    await fs.mkdir(path.join(__dirname, "report"), { recursive: true });
    await fs.writeFile(reportPath, report, "utf8");
    savingSpinner.succeed(`📄 Refactor report saved to ${reportPath}`);
  } catch (error) {
    savingSpinner.fail("Error saving the refactor report");
    console.error(chalk.red("Error saving the refactor report:", error));
  }
}

async function generateFolderStructure(dir) {
  const structure = [
    "modules/",
    "environments/dev/",
    "environments/prod/",
    "scripts/",
    "main.tf",
    "variables.tf",
    "outputs.tf",
    "backend.tf",
    "provider.tf",
  ];

  for (const item of structure) {
    const fullPath = path.join(dir, item);
    if (item.endsWith("/")) {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      await fs.writeFile(fullPath, "", "utf8");
    }
  }

  console.log(chalk.hex("#80EF80")("✅ Folder structure generated."));
}

async function checkSecurity(dir) {
  const spinner = ora("Running tfsec security checks...").start();
  exec(`tfsec ${dir}`, (err, stdout, stderr) => {
    spinner.stop();
    if (err) {
      console.error(chalk.red("❌ Security scan failed:"), stderr);
    } else {
      console.log(chalk.hex("#80EF80")("🔒 Security report:\n"));
      console.log(stdout);
    }
  });
}

async function deployTerraform(dir) {
  const commands = [
    "terraform fmt",
    "terraform init",
    "terraform validate",
    "terraform plan",
    "terraform apply -auto-approve",
  ];

  for (const cmd of commands) {
    console.log(chalk.hex("#80EF80")(`\n▶ ${cmd}`));
    await new Promise((resolve) => {
      const proc = exec(cmd, { cwd: dir }, (err, stdout, stderr) => {
        if (stdout) console.log(chalk.white(stdout));
        if (stderr) console.error(chalk.red(stderr));
        resolve();
      });

      proc.stdout?.pipe(process.stdout);
      proc.stderr?.pipe(process.stderr);
    });
  }
}

async function mainMenu() {
  printGreeting();
  const { action } = await prompts({
    type: "select",
    name: "action",
    message: chalk.hex("#80EF80")("What do you want to do?"),
    choices: [
      { title: chalk.white("✨ Generate Terraform Folder Structure"), value: "generateStructure" },
      { title: chalk.white("✨ Optimize Terraform Source Code"), value: "optimize" },
      { title: chalk.white("✨ Check for Security Issues"), value: "security" },
      { title: chalk.white("✨ Deploy Terraform Resources"), value: "deploy" },
    ],
  });

  if (!action) return;

  const { dir } = await prompts({
    type: "text",
    name: "dir",
    message: chalk.hex("#80EF80")("📁 Enter path to Terraform folder:"),
    initial: "./",
  });

  if (!dir) {
    console.log(chalk.red("No directory provided. Exiting."));
    return;
  }

  switch (action) {
    case "generateStructure":
      return generateFolderStructure(dir);
    case "optimize":
      return analyzeAndRefactor(dir);
    case "security":
      return checkSecurity(dir);
    case "deploy":
      return deployTerraform(dir);
  }
}

// Entrypoint
(async () => {
  await mainMenu();
})();
