import React from 'react';
import { Shield, Lock, Database, Users, FileText, Clock, CheckCircle } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const securityFeatures = [
    {
      icon: Shield,
      title: 'Enterprise SSO',
      description: 'Seamless integration with your existing identity providers including SAML, OAuth, and LDAP.',
      details: ['SAML 2.0 support', 'OAuth 2.0 integration', 'LDAP/Active Directory', 'Multi-factor authentication']
    },
    {
      icon: Users,
      title: 'Role-Based Access Control',
      description: 'Granular permissions system with predefined roles and custom access policies.',
      details: ['Predefined roles (Owner, Admin, PM, Viewer)', 'Custom permission sets', 'Project-level access control', 'Organization-wide policies']
    },
    {
      icon: FileText,
      title: 'Comprehensive Audit Logs',
      description: 'Track all user actions, data changes, and system events for compliance and security.',
      details: ['User activity logging', 'Data modification tracking', 'System access records', 'Exportable audit reports']
    },
    {
      icon: Database,
      title: 'Secure Data Handling',
      description: 'Enterprise-grade data protection with encryption at rest and in transit.',
      details: ['AES-256 encryption', 'TLS 1.3 for data in transit', 'Data residency controls', 'GDPR compliance ready']
    },
    {
      icon: Clock,
      title: 'Automated Backups',
      description: 'Daily automated backups with point-in-time recovery capabilities.',
      details: ['Daily automated backups', 'Point-in-time recovery', 'Cross-region replication', 'Backup verification testing']
    },
    {
      icon: Lock,
      title: 'Data Retention Policies',
      description: 'Configurable data retention policies with automated cleanup and compliance reporting.',
      details: ['Configurable retention periods', 'Automated data cleanup', 'Compliance reporting', 'Legal hold support']
    }
  ];

  return (
    <section id="security" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Enterprise Security & Compliance
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Built with enterprise-grade security from the ground up, ensuring your data and processes remain protected
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {securityFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow border border-gray-200"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {feature.description}
                </p>

                <ul className="space-y-2">
                  {feature.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Security Certifications & Compliance
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                We're committed to maintaining the highest security standards and are actively working towards SOC 2 Type II certification.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Regular security audits and penetration testing</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Compliance with industry standards (ISO 27001 framework)</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>24/7 security monitoring and incident response</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Regular security training for all team members</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-indigo-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Security Resources</h4>
              <div className="space-y-3">
                <a href="/security" className="block text-indigo-600 hover:text-indigo-700 font-medium">
                  Security Whitepaper →
                </a>
                <a href="/docs/security" className="block text-indigo-600 hover:text-indigo-700 font-medium">
                  Security Documentation →
                </a>
                <a href="/compliance" className="block text-indigo-600 hover:text-indigo-700 font-medium">
                  Compliance Information →
                </a>
                <a href="/security/audit" className="block text-indigo-600 hover:text-indigo-700 font-medium">
                  Security Audit Reports →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
