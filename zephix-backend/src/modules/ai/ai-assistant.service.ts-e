import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from '../resources/entities/resource.entity';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import Anthropic from '@anthropic-ai/sdk';

interface AIQuery {
  type: 'resource_assignment' | 'timeline_impact' | 'conflict_resolution';
  context: any;
  question: string;
}

interface AIResponse {
  answer: string;
  suggestions: Suggestion[];
  confidence: number;
}

interface Suggestion {
  action: string;
  impact: string;
  reasoning: string;
}

@Injectable()
export class AIAssistantService {
  private anthropic: Anthropic;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async processQuery(query: AIQuery, organizationId: string): Promise<AIResponse> {
    switch (query.type) {
      case 'resource_assignment':
        return await this.handleResourceAssignment(query, organizationId);
      case 'timeline_impact':
        return await this.handleTimelineImpact(query, organizationId);
      case 'conflict_resolution':
        return await this.handleConflictResolution(query, organizationId);
      default:
        throw new Error('Unknown query type');
    }
  }

  private async handleResourceAssignment(query: AIQuery, organizationId: string): Promise<AIResponse> {
    // Example: "Who can take this 40-hour React task?"
    const { taskId, requiredSkills, estimatedHours } = query.context;

    // Get all resources
    const resources = await this.resourceRepository.find({
      where: { organizationId },
    });

    // Get their current allocations
    const resourceAnalysis = [];
    for (const resource of resources) {
      const allocations = await this.getAllocationsForResource(resource.id, organizationId);
      const availability = this.calculateAvailability(allocations, resource.capacityHoursPerWeek);
      
      resourceAnalysis.push({
        resource,
        availability,
        skillMatch: this.calculateSkillMatch(resource.skills, requiredSkills),
      });
    }

    // Sort by best fit
    resourceAnalysis.sort((a, b) => {
      const scoreA = a.availability * 0.5 + a.skillMatch * 0.5;
      const scoreB = b.availability * 0.5 + b.skillMatch * 0.5;
      return scoreB - scoreA;
    });

    // Prepare context for Claude
    const prompt = `
      Task requires: ${estimatedHours} hours, Skills: ${requiredSkills.join(', ')}
      
      Available resources:
      ${resourceAnalysis.slice(0, 5).map(r => 
        `- ${r.resource.name}: ${r.availability}% available, ${r.skillMatch}% skill match`
      ).join('\n')}
      
      Provide 3 specific recommendations for resource assignment.
    `;

    const message = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const suggestions: Suggestion[] = resourceAnalysis.slice(0, 3).map(r => ({
      action: `Assign to ${r.resource.name}`,
      impact: `${r.availability}% available capacity, ${r.skillMatch}% skill match`,
      reasoning: r.skillMatch > 80 
        ? 'Strong skill match and available capacity'
        : 'Available capacity, may need support for skills',
    }));

    return {
      answer: typeof message.content[0] === 'string' 
        ? message.content[0] 
        : (message.content[0] as any).text || 'AI response generated',
      suggestions,
      confidence: resourceAnalysis[0].skillMatch > 80 ? 90 : 70,
    };
  }

  private async handleTimelineImpact(query: AIQuery, organizationId: string): Promise<AIResponse> {
    // Example: "What happens if we delay Project X by 1 week?"
    const { projectId, delayDays } = query.context;

    const project = await this.projectRepository.findOne({
      where: { id: projectId, organizationId },
      relations: ['tasks'],
    });

    const dependentProjects = await this.findDependentProjects(projectId, organizationId);
    
    const impact = {
      tasksAffected: project.tasks.length,
      resourcesFreed: await this.calculateResourcesFreed(projectId, delayDays, organizationId),
      dependentProjects: dependentProjects.length,
      costImpact: delayDays * 1000, // Simplified calculation
    };

    const suggestions: Suggestion[] = [
      {
        action: `Delay project by ${delayDays} days`,
        impact: `Frees ${impact.resourcesFreed} resources, affects ${impact.dependentProjects} dependent projects`,
        reasoning: 'Reduces immediate resource pressure',
      },
      {
        action: 'Maintain current timeline with overtime',
        impact: 'Increases cost by 20%, maintains dependencies',
        reasoning: 'Preserves project dependencies',
      },
      {
        action: 'Reduce scope to maintain timeline',
        impact: 'Delivers 80% of features on time',
        reasoning: 'Balances timeline and deliverables',
      },
    ];

    return {
      answer: `Delaying by ${delayDays} days would free ${impact.resourcesFreed} resources but impact ${impact.dependentProjects} dependent projects.`,
      suggestions,
      confidence: 85,
    };
  }

  private async handleConflictResolution(query: AIQuery, organizationId: string): Promise<AIResponse> {
    // Example: "How do we fix John's overallocation?"
    const { resourceId, conflictDetails } = query.context;

    const suggestions: Suggestion[] = [
      {
        action: 'Reassign low-priority tasks',
        impact: 'Reduces allocation by 30%',
        reasoning: 'Maintains critical work while reducing load',
      },
      {
        action: 'Extend task deadlines by 1 week',
        impact: 'Reduces weekly allocation to 90%',
        reasoning: 'Spreads work over longer period',
      },
      {
        action: 'Assign junior resource as support',
        impact: 'Reduces senior allocation by 40%',
        reasoning: 'Provides learning opportunity while reducing load',
      },
    ];

    return {
      answer: `Resource is at ${conflictDetails.allocationPercentage}% capacity. Recommend immediate rebalancing.`,
      suggestions,
      confidence: 90,
    };
  }

  // Helper methods
  private async getAllocationsForResource(resourceId: string, organizationId: string): Promise<any[]> {
    // Implementation to get allocations
    return [];
  }

  private calculateAvailability(allocations: any[], capacity: number): number {
    // Calculate percentage of available time
    return 100;
  }

  private calculateSkillMatch(resourceSkills: string[], requiredSkills: string[]): number {
    // Calculate skill match percentage
    return 80;
  }

  private async findDependentProjects(projectId: string, organizationId: string): Promise<Project[]> {
    // Find projects that depend on this one
    return [];
  }

  private async calculateResourcesFreed(projectId: string, delayDays: number, organizationId: string): Promise<number> {
    // Calculate how many resources would be freed
    return 3;
  }
}
