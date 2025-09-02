import { Test, TestingModule } from '@nestjs/testing';
import { ArchitectureDerivationService, BRDAnalysisInput } from './architecture-derivation.service';
import { LLMProviderService } from '../ai/llm-provider.service';
import { MetricsService } from '../observability/metrics.service';

describe('ArchitectureDerivationService', () => {
  let service: ArchitectureDerivationService;
  let llmProvider: LLMProviderService;
  let metricsService: MetricsService;

  const mockLLMProvider = {
    sendRequest: jest.fn(),
  };

  const mockMetricsService = {
    incrementLlmRequests: jest.fn(),
    incrementError: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchitectureDerivationService,
        {
          provide: LLMProviderService,
          useValue: mockLLMProvider,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<ArchitectureDerivationService>(ArchitectureDerivationService);
    llmProvider = module.get<LLMProviderService>(LLMProviderService);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockBRD = (): BRDAnalysisInput => ({
    id: 'test-brd-id',
    title: 'Test E-commerce Platform',
    overview: {
      project_name: 'E-commerce Platform',
      business_objective: 'Create online marketplace for retail products',
      problem_statement: 'Current manual sales process is inefficient',
      proposed_solution: 'Build web-based e-commerce platform',
    },
    scope: {
      in_scope: ['Product catalog', 'Shopping cart', 'Payment processing'],
      out_of_scope: ['Mobile apps', 'Physical inventory management'],
      assumptions: ['Internet connectivity available', 'Credit card processing available'],
      constraints: ['Budget limited to $100k', 'Must launch within 6 months'],
    },
    stakeholders: {
      business_owner: 'Business Owner',
      product_manager: 'Product Manager',
      technical_lead: 'Technical Lead',
      end_users: ['Customers', 'Store Managers'],
    },
    functional_requirements: [
      {
        id: 'REQ-001',
        title: 'User Registration',
        description: 'Users can create accounts',
        priority: 'high',
        acceptance_criteria: ['Email validation', 'Password strength requirements'],
      },
      {
        id: 'REQ-002',
        title: 'Product Search',
        description: 'Users can search for products',
        priority: 'high',
        acceptance_criteria: ['Text search', 'Category filtering'],
      },
    ],
    non_functional_requirements: {
      performance: {
        response_time_ms: 500,
        throughput_requests_per_second: 1000,
        concurrent_users: 500,
      },
      availability: {
        uptime_percentage: 99.9,
        recovery_time_minutes: 5,
      },
      security: {
        authentication_required: true,
        data_encryption: true,
        audit_logging: true,
      },
      scalability: {
        expected_growth_factor: 3,
        horizontal_scaling: true,
      },
    },
    timeline: {
      project_start: '2025-02-01',
      milestones: [
        {
          name: 'MVP Launch',
          date: '2025-04-01',
          deliverables: ['Basic product catalog', 'User registration'],
        },
        {
          name: 'Full Launch',
          date: '2025-06-01',
          deliverables: ['Payment processing', 'Order management'],
        },
      ],
    },
    risks: [
      {
        id: 'RISK-001',
        description: 'Third-party payment integration delays',
        impact: 'high',
        probability: 'medium',
        mitigation: 'Evaluate multiple payment providers early',
      },
      {
        id: 'RISK-002',
        description: 'Performance issues under load',
        impact: 'medium',
        probability: 'medium',
        mitigation: 'Implement load testing early in development',
      },
    ],
  });

  describe('deriveArchitecture', () => {
    it('should successfully derive architecture from BRD', async () => {
      // Arrange
      const mockBRD = createMockBRD();
      
      mockLLMProvider.sendRequest
        .mockResolvedValueOnce({
          content: JSON.stringify({
            drivers: [
              {
                category: 'business',
                driver: 'Revenue generation through online sales',
                impact: 'Requires scalable e-commerce architecture',
              },
            ],
            constraints: [
              {
                type: 'business',
                constraint: 'Budget limited to $100k',
                rationale: 'Startup funding constraints',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            options: [
              {
                option: 'A',
                name: 'Monolithic Architecture',
                description: 'Single deployable application',
                pros: ['Simple deployment', 'Easy development'],
                cons: ['Scaling challenges', 'Technology lock-in'],
                complexity: 'low',
                cost: 'low',
                risk: 'medium',
              },
              {
                option: 'B',
                name: 'Microservices Architecture',
                description: 'Distributed service-based architecture',
                pros: ['Independent scaling', 'Technology flexibility'],
                cons: ['Operational complexity', 'Network latency'],
                complexity: 'high',
                cost: 'high',
                risk: 'medium',
              },
              {
                option: 'C',
                name: 'Serverless Architecture',
                description: 'Cloud-native serverless functions',
                pros: ['Auto-scaling', 'Pay-per-use'],
                cons: ['Vendor lock-in', 'Cold start latency'],
                complexity: 'medium',
                cost: 'medium',
                risk: 'high',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            selected_option: 'A',
            rationale: 'Monolithic architecture best fits startup constraints and timeline',
            decision_criteria: ['Time to market', 'Development simplicity', 'Cost constraints'],
          }),
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            context: '@startuml\n!include <C4/C4_Context>\nPerson(customer, "Customer")\nSystem(ecommerce, "E-commerce Platform")\nSystem_Ext(payment, "Payment Provider")\nRel(customer, ecommerce, "Uses")\nRel(ecommerce, payment, "Processes payments")\n@enduml',
            container: '@startuml\n!include <C4/C4_Container>\nContainer(web, "Web Application", "React")\nContainer(api, "API", "Node.js")\nContainer(db, "Database", "PostgreSQL")\nRel(web, api, "API calls")\nRel(api, db, "Reads/Writes")\n@enduml',
            component: '@startuml\n!include <C4/C4_Component>\nComponent(auth, "Authentication", "Service")\nComponent(catalog, "Product Catalog", "Service")\nComponent(cart, "Shopping Cart", "Service")\nRel(auth, catalog, "Authorizes")\nRel(catalog, cart, "Updates")\n@enduml',
          }),
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            adrs: [
              {
                id: 'ADR-001',
                title: 'Use Monolithic Architecture',
                status: 'accepted',
                context: 'Need to select overall architecture pattern for e-commerce platform',
                decision: 'Adopt monolithic architecture for initial implementation',
                consequences: 'Faster initial development but potential scaling challenges later',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            threats: [
              {
                asset: 'Customer payment data',
                threat: 'Credit card data theft',
                stride_category: 'information_disclosure',
                impact: 'high',
                likelihood: 'medium',
                mitigation: 'Implement PCI DSS compliance and data encryption',
                status: 'open',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            questions: [
              {
                category: 'technical',
                question: 'What payment providers should be integrated?',
                stakeholder: 'Business Owner',
                urgency: 'high',
              },
            ],
          }),
        });

      // Act
      const result = await service.deriveArchitecture(mockBRD);

      // Assert
      expect(result).toBeDefined();
      expect(result.analysis_metadata.brd_id).toBe(mockBRD.id);
      expect(result.key_drivers).toHaveLength(1);
      expect(result.constraints).toHaveLength(1);
      expect(result.architecture_options).toHaveLength(3);
      expect(result.selected_option.option).toBe('A');
      expect(result.c4_diagrams.context).toContain('@startuml');
      expect(result.adrs).toHaveLength(1);
      expect(result.threat_model).toHaveLength(1);
      expect(result.open_questions).toHaveLength(1);

      expect(mockLLMProvider.sendRequest).toHaveBeenCalledTimes(7);
      expect(mockMetricsService.incrementLlmRequests).toHaveBeenCalledWith('anthropic', 'claude-3-sonnet', 'success');
    });

    it('should handle LLM provider errors gracefully', async () => {
      // Arrange
      const mockBRD = createMockBRD();
      const error = new Error('LLM service unavailable');
      
      mockLLMProvider.sendRequest.mockRejectedValue(error);

      // Act & Assert
      await expect(service.deriveArchitecture(mockBRD)).rejects.toThrow('LLM service unavailable');
      expect(mockMetricsService.incrementError).toHaveBeenCalledWith('architecture_derivation', 'architecture-service');
    });

    it('should handle invalid JSON responses from LLM', async () => {
      // Arrange
      const mockBRD = createMockBRD();
      
      mockLLMProvider.sendRequest.mockResolvedValue({
        content: 'invalid json response',
      });

      // Act & Assert
      await expect(service.deriveArchitecture(mockBRD)).rejects.toThrow();
      expect(mockMetricsService.incrementError).toHaveBeenCalledWith('architecture_derivation', 'architecture-service');
    });
  });

  describe('generateArchitectureBundle', () => {
    it('should generate complete architecture bundle', async () => {
      // Arrange
      const mockDerivation = {
        analysis_metadata: {
          brd_id: 'test-brd-id',
          generated_at: '2025-01-09T00:00:00.000Z',
          version: '1.0',
          analyst: 'Zephix AI Architecture Service',
        },
        key_drivers: [
          {
            category: 'business' as const,
            driver: 'Revenue generation',
            impact: 'Requires scalable architecture',
          },
        ],
        constraints: [
          {
            type: 'business' as const,
            constraint: 'Budget constraints',
            rationale: 'Limited funding',
          },
        ],
        architecture_options: [
          {
            option: 'A' as const,
            name: 'Monolithic',
            description: 'Single application',
            pros: ['Simple'],
            cons: ['Scaling issues'],
            complexity: 'low' as const,
            cost: 'low' as const,
            risk: 'medium' as const,
          },
        ],
        selected_option: {
          option: 'A' as const,
          rationale: 'Best for startup',
          decision_criteria: ['Time to market'],
        },
        c4_diagrams: {
          context: '@startuml\nContext diagram\n@enduml',
          container: '@startuml\nContainer diagram\n@enduml',
          component: '@startuml\nComponent diagram\n@enduml',
        },
        adrs: [
          {
            id: 'ADR-001',
            title: 'Architecture Decision',
            status: 'accepted' as const,
            context: 'Context',
            decision: 'Decision',
            consequences: 'Consequences',
          },
        ],
        threat_model: [
          {
            asset: 'Data',
            threat: 'Breach',
            stride_category: 'information_disclosure' as const,
            impact: 'high' as const,
            likelihood: 'low' as const,
            mitigation: 'Encryption',
            status: 'open' as const,
          },
        ],
        open_questions: [
          {
            category: 'technical' as const,
            question: 'Which database?',
            stakeholder: 'Technical Lead',
            urgency: 'high' as const,
          },
        ],
      };

      // Act
      const bundle = await service.generateArchitectureBundle(mockDerivation);

      // Assert
      expect(bundle.summary).toContain('# Architecture Summary');
      expect(bundle.summary).toContain('test-brd-id');
      expect(bundle.diagrams['context.puml']).toContain('@startuml');
      expect(bundle.diagrams['container.puml']).toContain('@startuml');
      expect(bundle.diagrams['component.puml']).toContain('@startuml');
      expect(bundle.adrs['adr-001-architecture-decision.md']).toContain('# ADR-001: Architecture Decision');
      expect(bundle.risks.threat_model).toHaveLength(1);
      expect(bundle.risks.open_questions).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should log errors appropriately', async () => {
      // Arrange
      const mockBRD = createMockBRD();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockLLMProvider.sendRequest.mockRejectedValue(new Error('Network error'));

      // Act
      try {
        await service.deriveArchitecture(mockBRD);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(mockMetricsService.incrementError).toHaveBeenCalled();
      
      // Cleanup
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
