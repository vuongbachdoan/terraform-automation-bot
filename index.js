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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set OS-based icons
const platform = os.platform();
const isWindows = platform === "win32";

const icons = {
  analyze: isWindows ? "🔍" : "🔍",
  success: isWindows ? "✔" : "✅",
  skip: isWindows ? "⏭" : "⏭️",
  warn: isWindows ? "!" : "⚠️",
  refactor: isWindows ? "*" : "✨",
  save: isWindows ? "💾" : "💾",
  rocket: isWindows ? ">" : "🚀",
  clock: isWindows ? "o" : "🕒",
  memory: isWindows ? "M" : "🧠",
  directory: isWindows ? "D" : "📁",
  question: isWindows ? "?" : "❓",
  yes: isWindows ? "[Y]" : "✔",
  no: isWindows ? "[N]" : "✖",
  "3tier": isWindows ? "[*]" : "🧱",
  s3website: isWindows ? "[*]" : "🌐",
  rds: isWindows ? "[*]" : "🗄️",
  vpc: isWindows ? "[*]" : "🌐",
  default: isWindows ? "[*]" : "📦",
};

// Format changes with magenta as main color
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
      `${chalk.hex("#80EF80")("Date:")} ${chalk.white(
        now.toLocaleString("en-GB", { timeZoneName: "short" })
      )}`,
      `${chalk.hex("#80EF80")(`Uptime:`)} ${Math.floor(
        uptime / 3600
      )}h ${Math.floor((uptime % 3600) / 60)}m`,
      `${chalk.hex("#80EF80")(`RAM:`)} ${memUsed.toFixed(
        0
      )}MB used / ${memTotal.toFixed(0)}MB total`,
      `${chalk.hex("#80EF80")(`Directory:`)} ${chalk.white(
        process.cwd()
      )}`,
      "",
      chalk.white(
        `Terraform Assistant helps improve readability, performance & security!`
      ),
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
  console.log(
    chalk.hex("#80EF80")(
      `${icons.analyze} Analyzing Terraform files in directory: ${dir}`
    )
  );
  const spinner = ora("Loading files...").start();
  const files = await readTfFiles(dir);
  spinner.succeed(`${icons.success} Files loaded successfully`);

  if (files.length === 0) {
    console.log(
      chalk.hex("#FFD700")(
        `${icons.warn} No Terraform files found in the directory!`
      )
    );
    return;
  }

  const prompt =
    "Can you refactor this Terraform code for readability, performance, and best practices? Respond with only the fixed code.";
  let changes = [];

  for (let file of files) {
    console.log(
      chalk.white.bold(`\n${icons.refactor} Refactoring file: ${file.path}`)
    );
    const fileSpinner = ora(`Refactoring ${file.path}`).start();
    const suggestion = await refactorFile(file, prompt);
    fileSpinner.succeed(`${icons.success} Refactor completed for ${file.path}`);

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
      message: chalk.hex("#80EF80")(
        `${icons.question} Do you want to apply these changes?`
      ),
      choices: [
        { title: chalk.green(`${icons.yes} Yes, apply`), value: true },
        { title: chalk.red(`${icons.no} No, skip`), value: false },
      ],
      initial: 0,
    });

    if (confirm.apply) {
      file.content = suggestion.suggestion;
      console.log(
        chalk.green(`${icons.success} Changes applied for ${file.path}`)
      );
    } else {
      console.log(chalk.gray(`${icons.skip} Skipped ${file.path}`));
    }
  }

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

  const savingSpinner = ora(`${icons.save} Saving refactor report...`).start();
  try {
    await fs.mkdir(path.join(__dirname, "report"), { recursive: true });
    await fs.writeFile(reportPath, report, "utf8");
    savingSpinner.succeed(
      `${icons.success} Refactor report saved to ${reportPath}`
    );
  } catch (error) {
    savingSpinner.fail(`${icons.warn} Error saving the refactor report`);
    console.error(chalk.red("Error saving the refactor report:", error));
  }
}

async function generateFolderStructure(dir) {
  const { projectType } = await prompts({
    type: "select",
    name: "projectType",
    message: chalk.hex("#80EF80")("How do you want to start your project?"),
    choices: [
      { title: "Build from scratch", value: "scratch" },
      { title: "Use a template", value: "template" },
    ],
    initial: 0,
  });

  const templateContents = {
    // Root Terraform files
    "main.tf": `terraform {
      required_providers {
        aws = {
          source  = "hashicorp/aws"
          version = "~> 5.0"
        }
      }
    }
    
    provider "aws" {
      region = var.region
    }`,
    "variables.tf": `variable "region" {
      description = "AWS region"
      type        = string
      default     = "us-east-1"
    }`,
    "outputs.tf": `output "region" {
      description = "The AWS region in use"
      value       = var.region
    }`,
    "provider.tf": `provider "aws" {
      region = var.region
    }`,
    "backend.tf": `terraform {
      backend "s3" {
        bucket = "my-terraform-state"
        key    = "global/s3/terraform.tfstate"
        region = "us-east-1"
      }
    }`,

    // 🟢 VPC Module
    "modules/vpc/main.tf": `resource "aws_vpc" "main" {
      cidr_block = "10.0.0.0/16"
      enable_dns_support = true
      enable_dns_hostnames = true
    
      tags = {
        Name = "main-vpc"
      }
    }`,

    // 🟢 Compute Module
    "modules/compute/main.tf": `resource "aws_instance" "web" {
      ami           = "ami-0c55b159cbfafe1f0" # Update for your region
      instance_type = "t2.micro"
      subnet_id     = "subnet-12345678"       # Replace with actual subnet ID
    
      tags = {
        Name = "web-instance"
      }
    }`,

    // 🟢 Database Module
    "modules/database/main.tf": `resource "aws_db_instance" "default" {
      allocated_storage    = 20
      engine               = "mysql"
      engine_version       = "8.0"
      instance_class       = "db.t3.micro"
      name                 = "mydb"
      username             = "admin"
      password             = "changeme123"
      parameter_group_name = "default.mysql8.0"
      skip_final_snapshot  = true
    
      tags = {
        Name = "mysql-database"
      }
    }`,

    // 🔵 Environment Dev/Test/Prod main.tf
    "environments/dev/main.tf": `module "vpc" {
      source = "../../modules/vpc"
    }
    
    module "compute" {
      source = "../../modules/compute"
    }
    
    module "database" {
      source = "../../modules/database"
    }
    
    output "environment" {
      value = "dev"
    }
    `,
    "environments/test/main.tf": `module "vpc" {
      source = "../../modules/vpc"
    }
    
    module "compute" {
      source = "../../modules/compute"
    }
    
    module "database" {
      source = "../../modules/database"
    }
    
    output "environment" {
      value = "test"
    }
    `,
    "environments/prod/main.tf": `module "vpc" {
      source = "../../modules/vpc"
    }
    
    module "compute" {
      source = "../../modules/compute"
    }
    
    module "database" {
      source = "../../modules/database"
    }
    
    output "environment" {
      value = "prod"
    }
  `,
  };

  const getTemplateStructure = (template) => {
    switch (template) {
      case "3tier":
        return [
          "modules/vpc/",
          "modules/compute/",
          "modules/database/",
          "environments/dev/",
          "environments/test/",
          "environments/prod/",
          "environments/dev/main.tf",
          "environments/test/main.tf",
          "environments/prod/main.tf",
          "main.tf",
          "variables.tf",
          "outputs.tf",
          "backend.tf",
          "provider.tf",
        ];
      case "s3website":
        return [
          "modules/s3/",
          "main.tf",
          "variables.tf",
          "outputs.tf",
          "backend.tf",
          "provider.tf",
        ];
      case "rds":
        return [
          "modules/rds/",
          "main.tf",
          "variables.tf",
          "outputs.tf",
          "backend.tf",
          "provider.tf",
        ];
      case "vpc":
        return [
          "modules/vpc/",
          "main.tf",
          "variables.tf",
          "outputs.tf",
          "backend.tf",
          "provider.tf",
        ];
      default:
        return [
          "modules/",
          "scripts/",
          "environments/dev/",
          "environments/test/",
          "environments/prod/",
          "main.tf",
          "variables.tf",
          "outputs.tf",
          "provider.tf",
          "backend.tf",
        ];
    }
  };

  let structure = [];

  if (projectType === "scratch") {
    const { layout } = await prompts({
      type: "select",
      name: "layout",
      message: chalk.hex("#FFD580")("Choose folder layout"),
      choices: [
        { title: "📁 Flat source", value: "flat" },
        { title: "🌍 Multi-environment (recommended)", value: "multi" },
      ],
      initial: 1,
    });

    structure =
      layout === "flat"
        ? [
            "main.tf",
            "variables.tf",
            "outputs.tf",
            "provider.tf",
            "backend.tf",
            "modules/",
            "scripts/",
          ]
        : [
            "modules/",
            "scripts/",
            "environments/dev/",
            "environments/test/",
            "environments/prod/",
            "main.tf",
            "variables.tf",
            "outputs.tf",
            "provider.tf",
            "backend.tf",
          ];
  } else {
    const { templateChoice } = await prompts({
      type: "select",
      name: "templateChoice",
      message: chalk.hex("#80EF80")("Choose a template:"),
      choices: [
        {
          title: `${icons["3tier"]} 3-tier AWS architecture`,
          value: "3tier",
        },
        {
          title: `${icons["s3website"]} Static website with S3`,
          value: "s3website",
        },
        { title: `${icons["rds"]} RDS MySQL only`, value: "rds" },
        { title: `${icons["vpc"]} Single VPC only`, value: "vpc" },
        {
          title: `${icons["default"]} Default template`,
          value: "default",
        },
      ],
      initial: 0,
    });

    structure = getTemplateStructure(templateChoice);
  }

  for (const item of structure) {
    const fullPath = path.join(dir, item);
    if (item.endsWith("/")) {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      const content = templateContents[item] || "";
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf8");
    }
  }

  console.log(chalk.green("✅ Project structure created at:"), dir);
}

async function checkSecurity(dir) {
  const spinner = ora("Running tfsec security checks...").start();
  exec(`tfsec ${dir}`, (err, stdout, stderr) => {
    spinner.stop();
    if (err) {
      console.error(chalk.red("❌ Security scan failed:"), stderr);
    } else {
      console.log(chalk.hex("#80EF80")(" Security report:\n"));
      console.log(stdout);
    }
  });
}

async function deployTerraform(dir) {
  // Check if Terraform is installed
  const checkTerraform = await new Promise((resolve) => {
    exec("which terraform", (err, stdout) => {
      resolve(Boolean(stdout && stdout.trim().length > 0));
    });
  });

  if (!checkTerraform) {
    const { install } = await prompts({
      type: "confirm",
      name: "install",
      message: chalk.hex("#FFD580")(
        "Terraform is not installed. Do you want to install it?"
      ),
      initial: true,
    });

    if (install) {
      console.log(chalk.hex("#80EF80")("Opening Terraform install guide..."));
      // Optional: open browser directly (only works in GUI)
      exec("xdg-open https://developer.hashicorp.com/terraform/downloads");
      console.log(
        chalk.hex("#FFD580")(
          "Please install Terraform and run the command again."
        )
      );
    } else {
      console.log(chalk.red("Terraform is required to deploy. Aborting."));
    }
    return;
  }

  const { proceed } = await prompts({
    type: "confirm",
    name: "proceed",
    message: chalk.hex("#80EF80")(
      "Terraform is installed. Do you want to deploy resources now?"
    ),
    initial: true,
  });

  if (!proceed) {
    console.log(chalk.gray("Deployment cancelled by user."));
    return;
  }

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

async function destroyTerraform(dir) {
  const checkTerraform = await new Promise((resolve) => {
    exec("which terraform", (err, stdout) => {
      resolve(Boolean(stdout && stdout.trim().length > 0));
    });
  });

  if (!checkTerraform) {
    const { install } = await prompts({
      type: "confirm",
      name: "install",
      message: chalk.hex("#FFD580")(
        "Terraform is not installed. Do you want to install it?"
      ),
      initial: true,
    });

    if (install) {
      exec("xdg-open https://developer.hashicorp.com/terraform/downloads");
      console.log(
        chalk.hex("#FFD580")(
          "Please install Terraform and run the command again."
        )
      );
    } else {
      console.log(chalk.red("Terraform is required to destroy. Aborting."));
    }
    return;
  }

  const { proceed } = await prompts({
    type: "confirm",
    name: "proceed",
    message: chalk.red(
      "⚠️  Are you sure you want to destroy all Terraform-managed infrastructure in this directory?"
    ),
    initial: false,
  });

  if (!proceed) {
    console.log(chalk.gray("Destroy operation cancelled by user."));
    return;
  }

  const command = "terraform destroy -auto-approve";
  console.log(chalk.red(`\n▶ ${command}`));

  await new Promise((resolve) => {
    const proc = exec(command, { cwd: dir }, (err, stdout, stderr) => {
      if (stdout) console.log(chalk.white(stdout));
      if (stderr) console.error(chalk.red(stderr));
      resolve();
    });

    proc.stdout?.pipe(process.stdout);
    proc.stderr?.pipe(process.stderr);
  });
}

async function mainMenu() {
  printGreeting();
  const { action } = await prompts({
    type: "select",
    name: "action",
    message: chalk.hex("#80EF80")("What do you want to do?"),
    choices: [
      {
        title: chalk.white("✨ Generate Terraform Folder Structure"),
        value: "generateStructure",
      },
      {
        title: chalk.white("✨ Optimize Terraform Source Code"),
        value: "optimize",
      },
      { title: chalk.white("✨ Check for Security Issues"), value: "security" },
      { title: chalk.white("✨ Deploy Terraform Resources"), value: "deploy" },
      { title: chalk.red("✨ Destroy Terraform Resources"), value: "destroy" },
    ],
  });

  if (!action) return;

  const { dir } = await prompts({
    type: "text",
    name: "dir",
    message: chalk.hex("#80EF80")("Enter path to Terraform folder:"),
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
    case "destroy":
      return destroyTerraform(dir);
  }
}

// Entrypoint
(async () => {
  await mainMenu();
})();
