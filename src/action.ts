import fs from "fs-extra";
import inquirer from "inquirer";
import path from "path";

export async function createProject(type: string) {
  const { folder } = await inquirer.prompt([
    {
      type: "input",
      name: "folder",
      message: `Enter ${type} project folder name:`,
      default: type === "frontend" ? "frontend-app" : "backend-app",
    },
  ]);

  const targetPath = path.join(process.cwd(), folder);

  if (fs.existsSync(targetPath)) {
    console.log(`Folder ${folder} already exists.`);
    return;
  }

  fs.mkdirSync(targetPath);
  console.log(`${type} project initialized in ${folder}`);
}

export async function createFile(type: string) {
  const { folder, fileName } = await inquirer.prompt([
    {
      type: "input",
      name: "folder",
      message: `Enter the folder where you want to create the ${type}:`,
      default: "src",
    },
    {
      type: "input",
      name: "fileName",
      message: `Enter the ${type} file name (without extension):`,
    },
  ]);

  const filePath = path.join(process.cwd(), folder, `${fileName}.ts`);

  if (fs.existsSync(filePath)) {
    console.log(`${type} file already exists.`);
    return;
  }

  let template = "";
  if (type === "middleware") {
    template = `export default function ${fileName}(req, res, next) {\n  next();\n}`;
  } else if (type === "route") {
    template = `import express from "express";\nconst router = express.Router();\nrouter.get("/", (req, res) => res.send("Hello World"));\nexport default router;`;
  }

  fs.outputFileSync(filePath, template);
  console.log(`${type} created at ${filePath}`);
}
