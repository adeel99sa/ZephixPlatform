const fs = require('fs');
const path = './src/modules/risks/risks.service.ts';
let content = fs.readFileSync(path, 'utf8');

// Add project existence check in create method
const createMethodFix = `
  async create(createRiskDto: CreateRiskDto, organizationId: string): Promise<Risk> {
    // Verify project exists and belongs to organization
    const project = await this.projectRepository.findOne({
      where: { 
        id: createRiskDto.project_id,
        organizationId 
      }
    });
    
    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }`;

// Find and replace the create method
const regex = /async create\(createRiskDto: CreateRiskDto, organizationId: string\): Promise<Risk> {/;
content = content.replace(regex, createMethodFix);

fs.writeFileSync(path, content);
console.log('✅ Added error handling to service');
