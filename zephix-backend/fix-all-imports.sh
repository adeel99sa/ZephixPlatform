#!/bin/bash

echo "Fixing User entity imports..."

# Fix imports in src root (like data-source.ts)
sed -i '' 's|from.*users/entities/user\.entity.*|from "./modules/users/entities/user.entity"|g' src/*.ts 2>/dev/null

# Fix imports in first level directories (like src/auth/)
for file in src/*/*.ts; do
  if [[ -f "$file" ]]; then
    sed -i '' 's|from.*users/entities/user\.entity.*|from "../modules/users/entities/user.entity"|g' "$file"
  fi
done

# Fix imports in second level directories (like src/auth/entities/)
for file in src/*/*/*.ts; do
  if [[ -f "$file" ]]; then
    sed -i '' 's|from.*users/entities/user\.entity.*|from "../../modules/users/entities/user.entity"|g' "$file"
  fi
done

# Fix imports in third level directories (like src/modules/auth/entities/)
for file in src/*/*/*/*.ts; do
  if [[ -f "$file" ]]; then
    # Special case for files already in modules directory
    if [[ "$file" == *"src/modules/auth"* ]]; then
      sed -i '' 's|from.*users/entities/user\.entity.*|from "../../users/entities/user.entity"|g' "$file"
    else
      sed -i '' 's|from.*users/entities/user\.entity.*|from "../../../modules/users/entities/user.entity"|g' "$file"
    fi
  fi
done

echo "Import fixes complete!"
