#!/usr/bin/env node
import fs from "fs";
import { extname, join, dirname, basename, resolve } from "path";
import * as glob from "glob";
import * as mkdirp from "mkdirp";
import parse from "./src/parser.js";
import { Command } from "commander";
import babelTraverse from "@babel/traverse";
const traverse = babelTraverse.default;
import { generate } from "@babel/generator";
import visitor from "./src/visitor.js";

// ===== CLI =====
const program = new Command();

program
  .name("bind-compile")
  .description("Custom compiler using Acorn + Babel traverse")
  .argument("<input>", "Input directory")
  .requiredOption("-d, --out-dir <dir>", "Output directory")
  .option("-v, --verbose", "Enable verbose logging", false)
  .parse(process.argv);

const options = program.opts();
const inputDir = program.args[0];
const outputDir = options.outDir;
const verbose = options.verbose;

// ===== HELPERS =====
function getAllFiles(dir) {
  return glob.sync("**/*.rbind", { cwd: dir });
}

function ensureDir(filePath) {
  mkdirp.sync(dirname(filePath));
}

// ===== MAIN =====
async function compile() {
  const files = getAllFiles(inputDir);

  if (verbose) {
    console.log(`Found ${files.length} files in ${inputDir}`);
  }

  const moduleGraph = new Map();
  for (const relativeFile of files) {
    const inputPath = resolve(inputDir, relativeFile);
    const baseName = basename(relativeFile, extname(relativeFile)) + ".js";
    const outputPath = join(outputDir, dirname(relativeFile), baseName);

    const code = fs.readFileSync(inputPath, "utf8");

    let ast;
    try {
      ast = parse(code, {
        sourceType: "module",
        sourceFile: inputPath,
        ecmaVersion: "latest",
      });
    } catch (err) {
      console.error(`Parse error in ${inputPath}:`, err.message);
      continue;
    }
    const refsMap = new Map();
    moduleGraph.set(inputPath, refsMap);
    traverse(ast, visitor(inputPath, moduleGraph));

    ensureDir(outputPath);
    if (verbose) console.log(`Writing: ${outputPath}`);
    fs.writeFileSync(outputPath, generate(ast).code);
  }
}

// Run
compile().catch((err) => {
  console.error(err);
  process.exit(1);
});
