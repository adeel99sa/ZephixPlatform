const fs = require('fs');

// Fix notification service
const notificationServicePath = 'src/modules/notifications/notification.service.ts';
let content = fs.readFileSync(notificationServicePath, 'utf8');

// Add result: 'success' to all audit.log calls that don't have it
content = content.replace(
  /await this\.auditService\.log\(\{([^}]+)\}\);?/g,
  (match, body) => {
    if (!body.includes('result:')) {
      // Add result before the closing brace
      const lines = body.split('\n');
      const lastLine = lines[lines.length - 1].trim();
      if (lastLine.endsWith(',')) {
        lines[lines.length - 1] = lastLine.slice(0, -1);
      }
      lines.push('      result: \'success\',');
      return `await this.auditService.log({\n${lines.join('\n')}\n    });`;
    }
    return match;
  }
);

fs.writeFileSync(notificationServicePath, content);
console.log('✅ Fixed notification service audit results');

// Fix resource allocation service
const resourceAllocationPath = 'src/modules/resources/services/resource-allocation.service.ts';
content = fs.readFileSync(resourceAllocationPath, 'utf8');

content = content.replace(
  /await this\.auditService\.log\(\{([^}]+)\}\);?/g,
  (match, body) => {
    if (!body.includes('result:')) {
      const lines = body.split('\n');
      const lastLine = lines[lines.length - 1].trim();
      if (lastLine.endsWith(',')) {
        lines[lines.length - 1] = lastLine.slice(0, -1);
      }
      lines.push('      result: \'success\',');
      return `await this.auditService.log({\n${lines.join('\n')}\n    });`;
    }
    return match;
  }
);

fs.writeFileSync(resourceAllocationPath, content);
console.log('✅ Fixed resource allocation service audit results');

// Fix permission guard
const permissionGuardPath = 'src/modules/auth/guards/permission.guard.ts';
content = fs.readFileSync(permissionGuardPath, 'utf8');

// Add result: 'failure' to permission denied
content = content.replace(
  /await this\.auditService\.log\(\{\s*userId: user\.id,\s*organizationId: user\.organizationId,\s*workspaceId: request\.workspaceId,\s*action: AuditAction\.PERMISSION_REVOKE,\s*resourceType: ResourceType\.PERMISSION,\s*resourceId: `\${requirement\.resource\}:\${requirement\.action\}`,\s*description: `Permission denied: \${requirement\.resource\}:\${requirement\.action\}`,\s*ipAddress: request\.ip,\s*userAgent: request\.headers\['user-agent'\],\s*\}\);/g,
  `await this.auditService.log({
        userId: user.id,
        organizationId: user.organizationId,
        workspaceId: request.workspaceId,
        action: AuditAction.PERMISSION_REVOKE,
        resourceType: ResourceType.PERMISSION,
        resourceId: \`\${requirement.resource}:\${requirement.action}\`,
        description: \`Permission denied: \${requirement.resource}:\${requirement.action}\`,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        result: 'failure',
      });`
);

// Add result: 'success' to permission granted
content = content.replace(
  /await this\.auditService\.log\(\{\s*userId: user\.id,\s*organizationId: user\.organizationId,\s*workspaceId: request\.workspaceId,\s*action: AuditAction\.PERMISSION_GRANT,\s*resourceType: ResourceType\.PERMISSION,\s*resourceId: `\${requirement\.resource\}:\${requirement\.action\}`,\s*description: `Permission granted: \${requirement\.resource\}:\${requirement\.action\}`,\s*ipAddress: request\.ip,\s*userAgent: request\.headers\['user-agent'\],\s*\}\);/g,
  `await this.auditService.log({
      userId: user.id,
      organizationId: user.organizationId,
      workspaceId: request.workspaceId,
      action: AuditAction.PERMISSION_GRANT,
      resourceType: ResourceType.PERMISSION,
      resourceId: \`\${requirement.resource}:\${requirement.action}\`,
      description: \`Permission granted: \${requirement.resource}:\${requirement.action}\`,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      result: 'success',
    });`
);

fs.writeFileSync(permissionGuardPath, content);
console.log('✅ Fixed permission guard audit results');

console.log('🎉 All audit result properties properly added!');
