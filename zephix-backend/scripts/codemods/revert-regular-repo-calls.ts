#!/usr/bin/env ts-node
/**
 * Revert incorrect codemod changes to regular Repository<T> calls
 * 
 * This script reverts changes where orgId was incorrectly added to
 * regular TypeORM Repository calls (not TenantAwareRepository)
 */

import { Project, SyntaxKind, Node } from "ts-morph";

const project = new Project({ 
  tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles("src/**/*.ts");

let totalReverted = 0;
let filesModified = 0;

for (const sourceFile of sourceFiles) {
  // Skip test files
  if (
    sourceFile.getFilePath().includes(".spec.ts") ||
    sourceFile.getFilePath().includes(".test.ts") ||
    sourceFile.getFilePath().includes(".e2e-spec.ts")
  ) {
    continue;
  }

  let fileReverted = 0;

  // Find all call expressions
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  
  for (const callExpr of callExpressions) {
    const expression = callExpr.getExpression();
    
    // Check if it's a property access (repo.method)
    if (!Node.isPropertyAccessExpression(expression)) {
      continue;
    }

    const methodName = expression.getName();
    if (!["create", "saveMany", "update", "delete"].includes(methodName)) {
      continue;
    }

    const args = callExpr.getArguments();
    if (args.length === 0) {
      continue;
    }

    // Check if first arg is orgId or organizationId
    const firstArg = args[0];
    if (!Node.isIdentifier(firstArg)) {
      continue;
    }

    const firstArgText = firstArg.getText();
    if (firstArgText !== "orgId" && firstArgText !== "organizationId") {
      continue;
    }

    // Check if the object is a regular Repository (not TenantAwareRepository)
    const objectExpr = expression.getExpression();
    const objectText = objectExpr.getText();
    
    // Check if this is from a transaction manager (manager.getRepository)
    // or if it's a regular Repository injection
    const parentText = callExpr.getParent()?.getText() || "";
    const isTransactionRepo = parentText.includes("manager.getRepository") || 
                              parentText.includes("getRepository(");
    
    // Check if the repository type is Repository<T> not TenantAwareRepository<T>
    const sourceText = sourceFile.getFullText();
    const repoTypeMatch = new RegExp(
      `(private|public|protected|readonly)\\s+\\w+\\s*:\\s*(Repository|TenantAwareRepository)<`,
      "g"
    );
    const matches = [...sourceText.matchAll(repoTypeMatch)];
    const hasTenantAware = matches.some(m => m[2] === "TenantAwareRepository");
    
    // If it's a transaction repo or regular Repository, revert the change
    if (isTransactionRepo || (!hasTenantAware && objectText.match(/(Repository|Repo)$/))) {
      try {
        // Remove first argument (orgId)
        callExpr.removeArgument(0);
        fileReverted++;
        totalReverted++;
      } catch (error) {
        console.error(`Error reverting ${sourceFile.getFilePath()}:${callExpr.getStartLineNumber()}: ${error}`);
      }
    }
  }

  if (fileReverted > 0) {
    filesModified++;
    console.log(`✅ Reverted ${fileReverted} calls in ${sourceFile.getFilePath()}`);
  }
}

// Save all changes
project.saveSync();

console.log(`\n📊 Summary:`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total calls reverted: ${totalReverted}`);
