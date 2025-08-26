export const LANDING_CONTENT = {
  hero: {
    headline: [
      "YOUR TEAM IS DROWNING.",
      "THE DATA SHOWS IT.",
      "YOU JUST CAN'T SEE IT."
    ],
    subheadline: "Current PM tools track tasks. Zephix reveals the human bottlenecks and resource conflicts hiding in your portfolio before they cascade into failure.",
    cta: "REQUEST EARLY ACCESS",
    ctaSubtext: "Join the waitlist. Free access when we launch Q2 2025."
  },
  metrics: {
    conflicts: { value: 2847, label: "Resource conflicts detected in testing", icon: "📊" },
    detection: { value: 3, label: "Average detection time", unit: "seconds", icon: "⚡" },
    accuracy: { value: "55-65", label: "Pattern accuracy after 30 days", unit: "%", icon: "🎯" }
  },
  problem: {
    title: "The Hidden Crisis in Project Management",
    subtitle: "Traditional tools miss the real problems until it's too late",
    problems: [
      {
        icon: "🚨",
        title: "Resource Conflicts Hidden",
        description: "83% of project failures stem from resource conflicts that PM tools can't see",
        stat: "83%",
        source: "PMI 2024 Report"
      },
      {
        icon: "⏰",
        title: "Late Detection",
        description: "Average time to detect critical issues: 14-21 days",
        stat: "14-21 days",
        source: "Gartner Research"
      },
      {
        icon: "💰",
        title: "Cascade Failures",
        description: "One delayed project can impact 3-5 others in your portfolio",
        stat: "3-5x",
        source: "McKinsey Analysis"
      }
    ]
  },
  solution: {
    title: "AI-Powered Early Warning System",
    subtitle: "See resource conflicts before they become project disasters",
    solutions: [
      {
        icon: "🔍",
        title: "Pattern Recognition",
        description: "AI learns your team's work patterns and detects anomalies weeks in advance",
        benefit: "14-21 day advance warning"
      },
      {
        icon: "📊",
        title: "Portfolio Intelligence",
        description: "Cross-project resource analysis reveals hidden bottlenecks and conflicts",
        benefit: "360° portfolio visibility"
      },
      {
        icon: "⚡",
        title: "Real-time Alerts",
        description: "Instant notifications when resource conflicts or bottlenecks are detected",
        benefit: "Immediate risk awareness"
      }
    ]
  },
  tech: {
    title: "Built for Enterprise Scale",
    subtitle: "Trusted by teams managing complex, multi-project portfolios",
    features: [
      {
        icon: "🔒",
        title: "SOC2 Compliant",
        description: "Enterprise-grade security with regular audits and compliance reporting"
      },
      {
        icon: "🌐",
        title: "Multi-tenant Architecture",
        description: "Isolated data environments with role-based access controls"
      },
      {
        icon: "📈",
        title: "99.9% Uptime SLA",
        description: "Guaranteed availability with real-time monitoring and alerting"
      },
      {
        icon: "🔌",
        title: "API-First Design",
        description: "Seamless integration with your existing tools and workflows"
      }
    ]
  },
  comparison: {
    title: "Why Zephix vs. Traditional Tools",
    subtitle: "We don't replace your PM tools - we make them intelligent",
    competitors: [
      {
        name: "Monday/Asana",
        taskTracking: "✅",
        resourceConflicts: "❌",
        predictiveAnalytics: "❌",
        portfolioView: "❌",
        aiLearning: "❌"
      },
      {
        name: "Jira",
        taskTracking: "✅",
        resourceConflicts: "❌",
        predictiveAnalytics: "❌",
        portfolioView: "❌",
        aiLearning: "❌"
      },
      {
        name: "ClickUp",
        taskTracking: "✅",
        resourceConflicts: "❌",
        predictiveAnalytics: "❌",
        portfolioView: "❌",
        aiLearning: "❌"
      },
      {
        name: "Zephix",
        taskTracking: "✅",
        resourceConflicts: "✅",
        predictiveAnalytics: "✅",
        portfolioView: "✅",
        aiLearning: "✅"
      }
    ]
  },
  timeline: {
    title: "Product Roadmap",
    subtitle: "See what's coming and help shape our development",
    phases: [
      {
        phase: "Q1 2026",
        title: "Early Access Launch",
        description: "Limited beta with core resource conflict detection",
        status: "current"
      },
      {
        phase: "Q2 2026",
        title: "Public Beta",
        description: "Full feature set with AI learning capabilities",
        status: "upcoming"
      },
      {
        phase: "Q3 2026",
        title: "Enterprise Features",
        description: "Advanced analytics, custom integrations, and white-label options",
        status: "planned"
      },
      {
        phase: "Q4 2026",
        title: "AI Marketplace",
        description: "Custom AI models and industry-specific intelligence",
        status: "planned"
      }
    ]
  },
  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Everything you need to know about Zephix",
    questions: [
      {
        question: "How does Zephix detect resource conflicts?",
        answer: "Our AI analyzes patterns across your entire project portfolio, including team availability, skill requirements, and project dependencies. It learns from historical data to predict where conflicts will occur before they impact delivery."
      },
      {
        question: "What if I'm already using Monday, Asana, or Jira?",
        answer: "Perfect! Zephix integrates with your existing tools. We don't replace them - we add intelligence layer that reveals insights they can't see. You keep your current workflow, we add the missing intelligence."
      },
      {
        question: "How accurate are the predictions?",
        answer: "Our AI starts at 55-65% accuracy and improves to 80%+ within 30 days as it learns your team's patterns. We're transparent about accuracy and continuously improve our models."
      },
      {
        question: "Is my data secure?",
        answer: "Absolutely. We're SOC2 compliant with enterprise-grade security. Your data is encrypted in transit and at rest, with strict access controls and regular security audits."
      },
      {
        question: "What's the setup process like?",
        answer: "Setup takes under 5 minutes. Connect your existing PM tools, and our AI starts learning immediately. No data migration or workflow changes required."
      },
      {
        question: "Can I try it before committing?",
        answer: "Yes! Join our early access program for free. You'll get full access to all features during the beta period, with no credit card required."
      }
    ]
  },
  cta: {
    title: "Ready to See What You're Missing?",
    subtitle: "Join the waitlist for early access to the future of project management",
    formTitle: "Request Early Access",
    formSubtitle: "Be among the first to experience AI-powered project intelligence",
    successMessage: "Welcome to the future! We'll notify you when early access begins.",
    errorMessage: "Something went wrong. Please try again or contact us directly."
  }
};

export const TEAM_SIZES = [
  { value: '1-10', label: '1-10 people' },
  { value: '11-50', label: '11-50 people' },
  { value: '51-200', label: '51-200 people' },
  { value: '200+', label: '200+ people' }
];

export const CURRENT_TOOLS = [
  { value: 'Monday', label: 'Monday.com' },
  { value: 'Asana', label: 'Asana' },
  { value: 'ClickUp', label: 'ClickUp' },
  { value: 'Jira', label: 'Jira' },
  { value: 'Other', label: 'Other' },
  { value: 'None', label: 'None currently' }
];

export const ANIMATION_VARIANTS = {
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  },
  fadeInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6 }
  },
  fadeInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6 }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.6 }
  }
};
