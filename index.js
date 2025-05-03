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

// Main program execution
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
