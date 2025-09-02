export const FORM_GENERATION_PROMPTS = {
  generateForm: `
You are an expert at creating enterprise project intake forms. Your goal is to create comprehensive, user-friendly forms that capture all necessary information while maintaining excellent user experience.

Given this description: "{description}"
${'Department context: {department}'}
${'Project type: {projectType}'}
${'Required integrations: {requiredIntegrations}'}

**TASK**: Generate a complete form structure that includes:

1. **FORM FIELDS** - Analyze the description and create appropriate fields with:
   - Logical field names and user-friendly labels
   - Appropriate field types (text, textarea, select, multiselect, date, number, file, checkbox, radio, email, phone, url)
   - Smart validation rules
   - Required/optional status based on business needs
   - Helpful placeholder text and guidance
   - Options arrays for select/radio fields

2. **FORM ORGANIZATION** - Structure the form with:
   - Logical sections that group related fields
   - Progressive disclosure where appropriate
   - Optimal field ordering for user flow
   - Clear section titles and descriptions

3. **WORKFLOW LOGIC** - Based on the context, suggest:
   - Approval workflows (who should approve what and when)
   - Assignment rules (who gets notified based on field values)
   - Routing logic (conditional paths based on responses)
   - Integration points with existing systems

4. **SMART FEATURES** - Include intelligent features:
   - Conditional field visibility
   - Auto-population suggestions
   - Smart validation rules
   - Default values where helpful

5. **DEPARTMENT-SPECIFIC CUSTOMIZATION**:
   - Marketing: Include budget ranges, campaign types, target audiences, ROI metrics
   - IT: Include priority levels, affected systems, business impact, technical requirements
   - HR: Include employee information, compliance requirements, approval hierarchies
   - Finance: Include cost centers, budget approval thresholds, financial justifications
   - Operations: Include process flows, resource requirements, timeline dependencies

**FIELD TYPE GUIDELINES**:
- Use 'select' for predefined options (3-8 choices)
- Use 'radio' for 2-4 mutually exclusive options
- Use 'multiselect' for multiple choice selections
- Use 'textarea' for descriptions, comments, requirements (>100 chars)
- Use 'text' for names, short descriptions, identifiers
- Use 'email' for email addresses with built-in validation
- Use 'phone' for phone numbers with formatting
- Use 'date' for deadlines, timelines, milestones
- Use 'number' for quantities, budgets, metrics
- Use 'file' for attachments, documents, media
- Use 'url' for links, references, resources

**VALIDATION BEST PRACTICES**:
- Email fields: Built-in email validation
- Phone fields: Format validation (US format preferred)
- URL fields: Valid URL structure
- Number fields: Appropriate min/max ranges
- Text fields: Character limits where appropriate
- Required fields: Only for truly essential information

**RETURN FORMAT**: Return valid JSON with this exact structure:
{
  "formStructure": {
    "fields": [
      {
        "id": "unique_field_id",
        "label": "User-friendly field label",
        "type": "field_type",
        "required": boolean,
        "placeholder": "Helpful placeholder text",
        "helpText": "Additional guidance for users",
        "options": ["option1", "option2"] // Only for select/radio/multiselect,
        "validation": {
          "min": number, // For numbers and text length
          "max": number, // For numbers and text length
          "pattern": "regex_pattern", // For custom validation
          "message": "User-friendly error message"
        },
        "defaultValue": "default_if_applicable",
        "conditional": {
          "field": "other_field_id",
          "operator": "equals|not_equals|contains|greater_than|less_than",
          "value": "condition_value"
        }
      }
    ],
    "sections": [
      {
        "id": "section_id",
        "title": "Section Title",
        "description": "Brief section description",
        "fields": ["field_id1", "field_id2"],
        "collapsible": false,
        "defaultExpanded": true
      }
    ],
    "layout": "single_column|two_column|tabs",
    "styling": {
      "theme": "default",
      "primaryColor": "#3B82F6",
      "backgroundColor": "#FFFFFF",
      "textColor": "#1F2937"
    }
  },
  "workflowConfiguration": {
    "approvalChain": [
      {
        "level": 1,
        "role": "Direct Manager",
        "condition": "always",
        "threshold": null
      },
      {
        "level": 2,
        "role": "Department Head",
        "condition": "budget > 5000",
        "threshold": 5000
      }
    ],
    "assignmentRules": [
      {
        "condition": "department === 'Marketing'",
        "assignTo": "marketing_lead",
        "priority": "medium"
      }
    ],
    "notifications": [
      {
        "trigger": "form_submitted",
        "recipients": ["manager@company.com"],
        "template": "new_submission_notification"
      }
    ],
    "automationTriggers": [
      {
        "condition": "priority === 'urgent'",
        "action": "escalate_immediately",
        "parameters": {"notify": ["director@company.com"]}
      }
    ]
  },
  "intelligentFeatures": {
    "conditionalLogic": [
      {
        "fieldId": "conditional_field",
        "conditions": [{"field": "trigger_field", "operator": "equals", "value": "show_value"}],
        "actions": [{"type": "show"}]
      }
    ],
    "validationRules": [
      {
        "fieldId": "budget_field",
        "rule": "number_range",
        "message": "Budget must be between $1,000 and $100,000"
      }
    ],
    "integrationSuggestions": ["slack", "email", "project_management"],
    "autoFieldTypes": {
      "field_id": "detected_type"
    }
  },
  "confidence": 0.95,
  "suggestedImprovements": [
    "Consider adding a priority field for better triage",
    "File upload field could help with supporting documentation"
  ]
}

**IMPORTANT**: Ensure all field IDs are unique, all section field references exist, and the structure is logically organized for optimal user experience.
`,

  refineForm: `
You are refining an existing form based on user feedback. Maintain the form's integrity while applying the requested changes intelligently.

**Current Form Structure**: 
{existingForm}

**User Refinement Request**: "{refinementRequest}"

**REFINEMENT GUIDELINES**:
1. **Preserve Good Elements**: Keep well-designed fields and sections unless specifically requested to change
2. **Apply Changes Thoughtfully**: Interpret the user's intent and make logical improvements
3. **Maintain Relationships**: Ensure field dependencies and workflow logic remain consistent
4. **Enhance User Experience**: Use refinements as opportunities to improve overall form quality
5. **Update Related Elements**: If changing fields, update sections, validation, and workflow accordingly

**COMMON REFINEMENT PATTERNS**:
- "Add field for X" → Create appropriate field with proper validation and placement
- "Make Y optional/required" → Update required status and adjust validation
- "Change X to dropdown" → Convert field type and add appropriate options
- "Add approval for Z" → Update workflow with new approval step
- "Group related fields" → Reorganize sections for better flow
- "Add validation to X" → Enhance validation rules with user-friendly messages

**FIELD PLACEMENT LOGIC**:
- Contact fields → Beginning of form
- Project details → Early sections
- Technical requirements → Middle sections
- Approvals/sign-offs → End of form
- Supporting documents → Near end but before submission

**RETURN FORMAT**: Return the complete updated form structure in the same JSON format as the original, with all requested changes applied and any necessary adjustments to maintain form integrity.

Focus on making the form more user-friendly while implementing the specific changes requested.
`,

  analyzeComplexity: `
Analyze this form description and determine its complexity level:

Description: "{description}"

Consider:
- Number of potential fields needed
- Workflow complexity
- Integration requirements
- Department-specific needs
- Approval processes

Return JSON:
{
  "complexity": "simple|moderate|complex",
  "reasoning": "explanation",
  "estimatedFields": number,
  "suggestedSections": number,
  "workflowComplexity": "linear|branching|matrix"
}
`,

  suggestImprovements: `
Review this form structure and suggest improvements:

Form: {formStructure}
Original Description: "{description}"

Analyze for:
1. Missing fields that would be valuable
2. User experience improvements
3. Validation enhancements
4. Workflow optimizations
5. Accessibility considerations

Return JSON array of improvement suggestions:
[
  {
    "type": "field_addition|field_modification|workflow_enhancement|ux_improvement",
    "priority": "high|medium|low",
    "suggestion": "specific improvement description",
    "reasoning": "why this would help",
    "implementation": "how to implement this"
  }
]
`,

  generateQuickSuggestions: `
Based on this partial form description, generate quick completion suggestions:

Partial Description: "{partialDescription}"

Provide 3-5 contextual suggestions that would help the user complete their form description:

Return JSON:
{
  "suggestions": [
    "Complete suggestion text that builds on their input",
    "Another helpful suggestion",
    "Third contextual suggestion"
  ],
  "detectedContext": "marketing|it|hr|finance|operations|general",
  "recommendedFields": ["field1", "field2", "field3"]
}
`,

  validateFormStructure: `
Validate this form structure for completeness and usability:

Form Structure: {formStructure}

Check for:
1. Required field balance (not too many required fields)
2. Logical field ordering
3. Appropriate field types for data
4. Missing essential fields
5. Section organization
6. Validation completeness

Return JSON:
{
  "isValid": boolean,
  "score": number, // 0-100
  "issues": [
    {
      "severity": "error|warning|suggestion",
      "message": "description of issue",
      "field": "field_id_if_applicable",
      "fix": "how to resolve this"
    }
  ],
  "strengths": ["what's working well"],
  "recommendations": ["specific improvements"]
}
`,
};

export const CONVERSATION_PROMPTS = {
  welcome: `
Welcome to the AI Form Designer! I can help you create professional intake forms using natural language.

Just describe what kind of form you need, like:
- "Create a marketing project request form"
- "Build a support ticket form for our IT department"
- "Design a vendor onboarding form with compliance requirements"

What would you like to create today?
`,

  clarification: `
I'd like to help you create the perfect form. Could you tell me more about:

- What department or team will use this form?
- What type of requests or information do you need to capture?
- Are there any specific fields or requirements you have in mind?
- Will this need approval workflows or integrations?

The more details you provide, the better I can tailor the form to your needs.
`,

  refinementAck: `
I understand you'd like to make some changes. I can help you:

- Add, remove, or modify fields
- Change field types (text to dropdown, etc.)
- Adjust required/optional settings
- Update validation rules
- Reorganize sections
- Modify workflow and approval processes

What specific changes would you like to make?
`,

  deploymentReady: `
Your form looks great! Here's what I can help you with next:

✅ **Preview**: See how your form will look to users
✅ **Test**: Try filling out the form yourself
✅ **Deploy**: Make it live and get your public URL
✅ **Integrate**: Set up notifications and workflows

What would you like to do next?
`,
};

export const DEPARTMENT_SPECIFIC_PROMPTS = {
  marketing: `
For marketing forms, typically include:
- Project/campaign name and type
- Target audience and demographics
- Budget range and approval thresholds
- Timeline and key milestones
- Success metrics and KPIs
- Creative requirements and assets needed
- Stakeholder information
- Brand guidelines compliance
`,

  it: `
For IT forms, typically include:
- Issue type and category
- Priority/urgency level
- Affected systems and users
- Business impact assessment
- Technical requirements
- Security considerations
- Timeline requirements
- Approval for resource allocation
`,

  hr: `
For HR forms, typically include:
- Employee information
- Request type and justification
- Manager approval
- Budget implications
- Compliance requirements
- Timeline and urgency
- Supporting documentation
- Privacy considerations
`,

  finance: `
For finance forms, typically include:
- Cost center and budget codes
- Financial justification
- Amount and currency
- Approval hierarchy based on amount
- Payment terms and vendor info
- ROI and business case
- Risk assessment
- Compliance and audit trail
`,

  operations: `
For operations forms, typically include:
- Process or service affected
- Resource requirements
- Timeline and dependencies
- Quality standards
- Safety considerations
- Stakeholder impact
- Change management needs
- Success criteria
`,
};
