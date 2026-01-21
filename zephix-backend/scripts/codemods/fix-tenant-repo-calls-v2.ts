#!/usr/bin/env ts-node
/**
 * Codemod to fix TenantAwareRepository calls to use explicit orgId parameter
 * 
 * V2: Only edits TenantAwareRepository calls, skips regular Repository<T>
 * 
 * Transforms:
 * - repo.create({...}) -> repo.create(orgId, {...})
 * - repo.saveMany([...]) -> repo.saveMany(orgId, [...])
 * - repo.update(id, {...}) -> repo.update(orgId, id, {...})
 * - repo.delete(id) -> repo.delete(orgId, id)
 * - repo.qb('alias') -> repo.qb(orgId, 'alias')
 * - repo.findByIds([...]) -> repo.findByIds(orgId, [...])
 */

import { Project, SyntaxKind, Node, TypeChecker } from "ts-morph";

const METHODS = new Set(["create", "saveMany", "update", "delete", "qb", "findByIds"]);
const ORG_VARS = ["orgId", "organizationId"];
const SKIP_TYPES = ["Repository", "EntityManager", "QueryRunner", "DataSource"];

const project = new Project({ 
  tsConfigFilePath: "tsconfig.json",
  skipAddingFilesFromTsConfig: false,
});

const checker = project.getTypeChecker();

// Get all source files
const sourceFiles = project.getSourceFiles("src/**/*.ts");

let totalFixed = 0;
let filesModified = 0;
let skipped = 0;

/**
 * Check if a call expression is on a TenantAwareRepository
 */
function isTenantAwareRepositoryCall(
  callExpr: any,
  checker: TypeChecker
): boolean {
  const expression = callExpr.getExpression();
  if (!Node.isPropertyAccessExpression(expression)) {
    return false;
  }

  const objectExpr = expression.getExpression();
  
  try {
    const type = checker.getTypeAtLocation(objectExpr);
    const typeText = type.getText();
    
    // Check if it's TenantAwareRepository
    if (typeText.includes("TenantAwareRepository")) {
      return true;
    }
    
    // Skip if it's a regular Repository or other TypeORM types
    for (const skipType of SKIP_TYPES) {
      if (typeText.includes(`${skipType}<`) || typeText === skipType) {
        return false;
      }
    }
    
    // Check symbol name
    const symbol = type.getSymbol();
    if (symbol) {
      const symbolName = symbol.getName();
      if (symbolName === "TenantAwareRepository") {
        return true;
      }
      if (SKIP_TYPES.includes(symbolName)) {
        return false;
      }
    }
    
    // Check if object text suggests it's a repository but not TenantAware
    const objectText = objectExpr.getText();
    if (objectText.match(/(Repository|Repo)$/) && !typeText.includes("TenantAware")) {
      // Check if it's from getRepository (transaction manager)
      const parentText = callExpr.getParent()?.getText() || "";
      if (parentText.includes("getRepository(") || parentText.includes("manager.getRepository")) {
        return false;
      }
    }
    
    return false;
  } catch (error) {
    // If type checking fails, be conservative and skip
    return false;
  }
}

for (const sourceFile of sourceFiles) {
  // Skip test files and the repository itself
  if (
    sourceFile.getFilePath().includes(".spec.ts") ||
    sourceFile.getFilePath().includes(".test.ts") ||
    sourceFile.getFilePath().includes(".e2e-spec.ts") ||
    sourceFile.getFilePath().includes("tenant-aware.repository.ts") ||
    sourceFile.getFilePath().includes("scripts/") ||
    sourceFile.getFilePath().includes("migrations/") ||
    sourceFile.getFilePath().includes("database/seeds/")
  ) {
    continue;
  }

  // Check if file has orgId or organizationId variable
  const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
  const hasOrgVar = ORG_VARS.some(v => 
    identifiers.some(id => id.getText() === v && !isInStringOrComment(id))
  );

  if (!hasOrgVar) {
    continue; // Skip files without orgId in scope
  }

  // Find which org variable exists
  const orgVar = ORG_VARS.find(v => 
    identifiers.some(id => id.getText() === v && !isInStringOrComment(id))
  );

  if (!orgVar) {
    continue;
  }

  let fileFixed = 0;
  let fileSkipped = 0;

  // Find all call expressions
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  
  for (const callExpr of callExpressions) {
    const expression = callExpr.getExpression();
    
    // Check if it's a property access (repo.method)
    if (!Node.isPropertyAccessExpression(expression)) {
      continue;
    }

    const methodName = expression.getName();
    if (!METHODS.has(methodName)) {
      continue;
    }

    // V2: Only edit TenantAwareRepository calls
    if (!isTenantAwareRepositoryCall(callExpr, checker)) {
      fileSkipped++;
      continue;
    }

    const args = callExpr.getArguments();
    if (args.length === 0) {
      continue;
    }

    // Check if first arg is already orgId
    const firstArg = args[0];
    if (Node.isIdentifier(firstArg) && firstArg.getText() === orgVar) {
      continue; // Already has orgId
    }

    // Insert orgId as first argument
    try {
      callExpr.insertArgument(0, orgVar);
      fileFixed++;
      totalFixed++;
    } catch (error) {
      console.error(`Error fixing ${sourceFile.getFilePath()}:${callExpr.getStartLineNumber()}: ${error}`);
    }
  }

  if (fileFixed > 0) {
    filesModified++;
    console.log(`✅ Fixed ${fileFixed} calls (skipped ${fileSkipped} non-TenantAware) in ${sourceFile.getFilePath()}`);
  }
  skipped += fileSkipped;
}

// Save all changes
project.saveSync();

console.log(`\n📊 Summary:`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total calls fixed: ${totalFixed}`);
console.log(`   Total calls skipped (not TenantAwareRepository): ${skipped}`);

// Helper to check if identifier is in string or comment
function isInStringOrComment(node: Node): boolean {
  const parent = node.getParent();
  if (!parent) return false;
  
  const kind = parent.getKind();
  return (
    kind === SyntaxKind.StringLiteral ||
    kind === SyntaxKind.TemplateExpression ||
    kind === SyntaxKind.SingleLineCommentTrivia ||
    kind === SyntaxKind.MultiLineCommentTrivia
  );
}
