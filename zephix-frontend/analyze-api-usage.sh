#!/bin/bash

echo "=== Files using response.data ==="
grep -r "response\.data" src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq

echo -e "\n=== Files importing from mockApi ==="
grep -r "mockApi" src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq

echo -e "\n=== Files using old api import ==="
grep -r "import.*{.*api.*}.*from.*['\"].*api" src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq

echo -e "\n=== Summary ==="
echo "Files with response.data: $(grep -r "response\.data" src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq | wc -l)"
echo "Files with mockApi: $(grep -r "mockApi" src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq | wc -l)"
echo "Files with old api import: $(grep -r "import.*{.*api.*}.*from.*['\"].*api" src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq | wc -l)"
