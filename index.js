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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Utility to format changes with color
function formatDiff(oldContent, newContent) {
  let diffOutput = "";
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (
      i < oldLines.length &&
      j < newLines.length &&
      oldLines[i] === newLines[j]
    ) {
      diffOutput += chalk.gray("  " + oldLines[i]) + "\n"; // unchanged line dimmed
      i++;
      j++;
    } else {
      if (i < oldLines.length) {
        diffOutput += chalk.red("- " + oldLines[i]) + "\n"; // deleted line
        i++;
      }
      if (j < newLines.length) {
        diffOutput += chalk.blue("+ " + newLines[j]) + "\n"; // added line
        j++;
      }
    }
  }
  return diffOutput;
}

// CLI Greeting with stylized UI
function printGreeting() {
  const asciiArt = figlet.textSync("Terraform Refactor", {
    font: "Standard",
    horizontalLayout: "default",
    verticalLayout: "default",
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
      chalk.blue(asciiArt),
      chalk.bold.green(`${username}@${hostname}`),
      "",
      chalk.bold("📅 Date:") +
        " " +
        chalk.cyan(now.toLocaleString("en-GB", { timeZoneName: "short" })),
      chalk.bold("⏱️ Uptime:") +
        ` ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      chalk.bold("💾 RAM:") +
        ` ${chalk.yellow(memUsed.toFixed(0))}MB used / ${chalk.yellow(
          memTotal.toFixed(0)
        )}MB total`,
      chalk.bold("📁 Current Working Directory: ") + chalk.cyan(process.cwd()),
      "",
      chalk.yellow(
        "Terraform Refactor Tool will help you improve code readability and performance!"
      ),
    ].join("\n"),
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "green",
    }
  );

  console.log(greetingBox);
}

// Refactor the files and ask for confirmation
async function analyzeAndRefactor(dir) {
  console.log(`🔍 Analyzing Terraform files in directory: ${dir}`);
  const spinner = ora("Loading files...").start();

  const files = await readTfFiles(dir);
  spinner.succeed("Files loaded successfully");

  if (files.length === 0) {
    console.log(chalk.red("No Terraform files found in the directory!"));
    return;
  }

  const prompt =
    "Can you refactor this Terraform code for readability, performance, and best practices? Respond with only the fixed code.";

  let changes = [];

  for (let file of files) {
    console.log(chalk.green(`\nRefactoring file: ${file.path}`));

    const fileSpinner = ora(`Refactoring ${file.path}`).start();
    const suggestion = await refactorFile(file, prompt);
    fileSpinner.succeed(`Refactor completed for ${file.path}`);

    const diff = formatDiff(file.content, suggestion.suggestion);
    changes.push({ file, diff, suggestion });

    // Show styled diff
    const boxedDiff = boxen(diff, {
      padding: 1,
      margin: 1,
      borderStyle: "double",
      borderColor: "cyan",
      title: `Proposed changes in ${path.basename(file.path)}`,
      titleAlignment: "center",
    });

    console.log(boxedDiff);

    // Ask for confirmation to apply
    const confirm = await prompts({
      type: "select",
      name: "apply",
      message: chalk.yellowBright("Do you want to apply these changes?"),
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

  // Generate a report
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(
    __dirname,
    "report",
    `refactor-report-${timestamp}.md`
  );
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

// Add to existing imports
import { exec } from "child_process";

// Option Menu
async function mainMenu() {
  printGreeting();

  const { action } = await prompts({
    type: "select",
    name: "action",
    message: "🛠️ What do you want to do?",
    choices: [
      {
        title: "🗂️ Generate Terraform Folder Structure",
        value: "generateStructure",
      },
      { title: "✨ Optimize Terraform Source Code", value: "optimize" },
      { title: "🔒 Check for Security Issues", value: "security" },
      { title: "🚀 Deploy Terraform Resources", value: "deploy" },
    ],
  });

  if (!action) return;

  const { dir } = await prompts({
    type: "text",
    name: "dir",
    message: "📁 Enter path to Terraform folder:",
    initial: "./",
  });

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

// Generate folder structure best practice
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

  console.log(chalk.green("✅ Best practice folder structure generated."));
}

// Check for security issues (stub using tfsec)
async function checkSecurity(dir) {
  const spinner = ora("Checking Terraform code for security issues...").start();
  exec(`tfsec ${dir}`, (err, stdout, stderr) => {
    spinner.stop();
    if (err) {
      console.error(chalk.red("❌ Security scan failed:"), stderr);
    } else {
      console.log(chalk.blue("🔍 Security report:\n"));
      console.log(stdout);
    }
  });
}

// Deploy Terraform (fmt, validate, plan, apply)
async function deployTerraform(dir) {
  const commands = [
    "terraform fmt",
    "terraform init",
    "terraform validate",
    "terraform plan",
    "terraform apply -auto-approve",
  ];

  for (const cmd of commands) {
    console.log(chalk.cyan(`\n▶ ${cmd}`));
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

// Replace this:
(async () => {
  printGreeting();
  const response = await prompts({
    type: "text",
    name: "dir",
    message: "📁 Enter path to Terraform folder:",
    initial: "./",
  });

  if (!response.dir) return;
  await analyzeAndRefactor(response.dir);
})();

// With this:
(async () => {
  await mainMenu();
})();
