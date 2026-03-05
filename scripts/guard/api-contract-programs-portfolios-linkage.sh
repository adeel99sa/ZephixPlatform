#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACT_FILE="${ROOT_DIR}/docs/api-contract/staging/programs-portfolios-linkage-contract.json"

if [[ ! -f "${CONTRACT_FILE}" ]]; then
  echo "Missing contract file: ${CONTRACT_FILE}"
  exit 1
fi

node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(!Array.isArray(c.flow)){console.error('Contract must include flow array');process.exit(1)}const required=['health_ready','version','csrf','smoke_login','auth_me','workspaces_list','program_create','portfolio_create','project_create','project_link','project_get'];const byStep=new Map(c.flow.map(s=>[s.step,s]));for(const step of required){if(!byStep.has(step)){console.error('Missing required step: '+step);process.exit(1)}}for(const [step,item] of byStep.entries()){if(typeof item.method!=='string'||typeof item.path!=='string'){console.error('Invalid step shape: '+step);process.exit(1)}const statuses=Array.isArray(item.status)?item.status:[item.status];if(statuses.length===0||statuses.some(v=>!Number.isInteger(v))){console.error('Invalid statuses for step: '+step);process.exit(1)}console.log(step+'\t'+item.method+'\t'+item.path+'\t'+statuses.join(','))}" "${CONTRACT_FILE}"
