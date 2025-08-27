export const LANDING_CONTENT = {
  hero: {
    headline: [
      "Is a hidden resource conflict",
      "about to derail your project?"
    ],
    subheadline: "Your dashboard is green, but you have a gut feeling something's wrong. You're not alone. We're building a solution to find these hidden bottlenecks—and we need your help.",
    cta: "Join the Q1 2026 Beta Waitlist",
    ctaSubtext: "Be among the first 50 founding users"
  },
  metrics: {
    conflicts: { value: "Hidden", label: "Resource conflicts detected", icon: "📊" },
    detection: { value: "Proactive", label: "Early warning system", unit: "", icon: "⚡" },
    accuracy: { value: "Learning", label: "AI pattern recognition", unit: "", icon: "🎯" }
  },
  problem: {
    title: "Does this sound familiar?",
    subtitle: "Your tools track tasks, but they don't see the real-world resource conflicts",
    problems: [
      {
        icon: "😓",
        title: "Burnout Discovery",
        description: "We discovered our lead developer was assigned to 5 critical tasks on the same day... when she called in sick from burnout.",
        stat: "Common Issue",
        source: "Project Management Reality"
      },
      {
        icon: "😤",
        title: "Cascade Failures",
        description: "A one-week delay in the API project silently cascaded into three other projects. We found out in the quarterly review.",
        stat: "Silent Impact",
        source: "Portfolio Management"
      },
      {
        icon: "🤯",
        title: "Hidden Dependencies",
        description: "Our PM tools track 156 fields, but couldn't tell us that our entire Q4 roadmap depended on one overworked contractor.",
        stat: "Critical Gap",
        source: "Project Management Reality"
      }
    ]
  },
  solution: {
    title: "This is why we're building Zephix",
    subtitle: "Imagine if you could...",
    solutions: [
      {
        icon: "🔍",
        title: "What if you could see hidden bottlenecks?",
        description: "Before they cause delays, before people burn out, before projects cascade into failure.",
        benefit: "Early warning system"
      },
      {
        icon: "🔗",
        title: "What if delays showed their true impact?",
        description: "See how one delay affects every connected project, with real dollar amounts and timeline impacts.",
        benefit: "Cascade visibility"
      },
      {
        icon: "📊",
        title: "What if AI learned your patterns?",
        description: "Not magic predictions, but statistical patterns that show where failures typically happen in YOUR organization.",
        benefit: "Data-driven insights"
      }
    ]
  },
  tech: {
    title: "Built for Modern Teams",
    subtitle: "Designed for teams managing complex, multi-project portfolios",
    features: [
      {
        icon: "🔒",
        title: "Security First",
        description: "Enterprise-grade security with encryption and access controls"
      },
      {
        icon: "🌐",
        title: "Multi-tenant Architecture",
        description: "Isolated data environments with role-based access controls"
      },
      {
        icon: "📈",
        title: "High Availability",
        description: "Built for reliability with monitoring and alerting"
      },
      {
        icon: "🔌",
        title: "API-First Design",
        description: "Seamless integration with your existing tools and workflows"
      }
    ]
  },
  comparison: {
    title: "What Makes Us Different",
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
    title: "Development Roadmap",
    subtitle: "See what's coming and help shape our development",
    phases: [
      {
        phase: "Q4 2025",
        title: "Final Development & Testing",
        description: "Completing core features and internal testing",
        status: "current"
      },
      {
        phase: "Q1 2026",
        title: "Private Beta Launch",
        description: "Limited beta with first 50 founding users",
        status: "upcoming"
      },
      {
        phase: "Q2 2026",
        title: "Public Launch",
        description: "Full feature set with AI learning capabilities",
        status: "planned"
      },
      {
        phase: "Q3 2026",
        title: "Enterprise Features",
        description: "Advanced analytics, custom integrations, and white-label options",
        status: "planned"
      }
    ]
  },
  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Everything you need to know about joining the Zephix founding team",
    questions: [
      {
        question: "When will Zephix be available?",
        answer: "We're targeting Q1 2026 for our private beta launch with the first 50 users. Public launch is planned for Q2 2026."
      },
      {
        question: "How much will it cost?",
        answer: "Pricing isn't finalized, but founding members will receive lifetime 50% discount. We're aiming for $15-25 per user per month."
      },
      {
        question: "What if I join the waitlist?",
        answer: "You'll get early access, direct input on features, and founding member pricing. No payment or commitment required."
      },
      {
        question: "How is this different from Asana/Monday/Jira?",
        answer: "Those tools track tasks. We reveal hidden resource conflicts and cross-project dependencies they can't see."
      },
      {
        question: "Is my data secure?",
        answer: "Yes. We're building with security-first principles: encryption, isolated tenants, and SOC 2 compliance on our roadmap."
      },
      {
        question: "Can I try it before committing?",
        answer: "Yes! Join our founding waitlist for free. You'll get full access to all features during the beta period, with no credit card required."
      }
    ]
  },
  cta: {
    title: "Help us build it right",
    subtitle: "Zephix is in active development. We're looking for a small group of project leaders to guide its creation.",
    formTitle: "Join the Founding Waitlist",
    formSubtitle: "Be among the first 50 users to access the Q1 2026 beta",
    successMessage: "Welcome to the founding team! We'll notify you when early access begins.",
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
