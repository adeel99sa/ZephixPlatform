#!/bin/bash

echo "Fixing imports in modules that are importing from ../modules/ when they're already in modules/"

# For files in src/modules/*/
find src/modules -maxdepth 2 -name "*.ts" -type f | while read file; do
  # Fix ../modules/ to ../
  sed -i '' 's|from '\''../modules/\([^'\'']*\)'\'';|from '\''../\1'\'';|g' "$file"
  sed -i '' 's|from "../modules/\([^"]*\)";|from "../\1";|g' "$file"
done

# For files in src/modules/*/*/
find src/modules -mindepth 3 -name "*.ts" -type f | while read file; do
  # Fix ../../modules/ to ../../
  sed -i '' 's|from '\''../../modules/\([^'\'']*\)'\'';|from '\''../../\1'\'';|g' "$file"
  sed -i '' 's|from "../../modules/\([^"]*\)";|from "../../\1";|g' "$file"
  
  # Fix ../../../modules/ to ../../../
  sed -i '' 's|from '\''../../../modules/\([^'\'']*\)'\'';|from '\''../../../\1'\'';|g' "$file"
  sed -i '' 's|from "../../../modules/\([^"]*\)";|from "../../../\1";|g' "$file"
done

# Fix references from src/config to modules
find src/config -name "*.ts" -type f | while read file; do
  sed -i '' 's|from '\''../feedback/|from '\''../modules/feedback/|g' "$file"
done

echo "Import fixes completed"
