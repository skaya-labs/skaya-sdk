#!/usr/bin/env ts-node

import { Command } from "commander";
import inquirer from "inquirer";
import { createProject, createFile } from "../src/action";

const program = new Command();

program
  .command("init <type>")
  .description("Initialize a project")
  .action(async (type) => {
    if (!["frontend", "backend"].includes(type)) {
      console.log("Invalid type. Use 'frontend' or 'backend'.");
      return;
    }
    await createProject(type);
  });

program
  .command("create <type>")
  .description("Create a new component (middleware, route)")
  .action(async (type) => {
    if (!["middleware", "route"].includes(type)) {
      console.log("Invalid type. Use 'middleware' or 'route'.");
      return;
    }
    await createFile(type);
  });

program.parse(process.argv);
