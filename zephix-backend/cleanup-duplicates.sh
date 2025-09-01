#!/bin/bash
echo "=== Zephix Duplicate Cleanup Script ==="
echo "WARNING: This will remove duplicate modules. Backup first!"
read -p "Have you backed up the database and code? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then exit 1; fi

# Step 1: Remove old module duplicates (keeping new structure)
echo "Removing legacy auth module..."
rm -rf src/auth/

echo "Removing legacy projects module..."
rm -rf src/projects/

echo "Removing legacy resources module..."
rm -rf src/resources/

echo "Removing duplicate workflow templates..."
rm -rf src/pm/entities/workflow-template.entity.ts

echo "Removing duplicate services..."
rm -rf src/shared/services/email.service.ts
rm -rf src/shared/services/metrics.service.ts

# Step 2: Update app.module.ts imports
echo "Updating app.module.ts imports..."
# This needs manual editing - script will show what needs changing
echo "MANUAL CHANGES NEEDED IN app.module.ts:"
echo "  - Change './auth/auth.module' to './modules/auth/auth.module'"
echo "  - Change './projects/projects.module' to './modules/projects/projects.module'"
echo "  - Change './resources/resources.module' to './modules/resources/resources.module'"
echo "  - Remove duplicate ResourceModule import"

echo "Cleanup plan created. Review before executing."
