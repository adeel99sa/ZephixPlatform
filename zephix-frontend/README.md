# Zephix Frontend

A modern React application for project management and AI-powered collaboration, built with TypeScript, Vite, and Tailwind CSS.

## 🚀 Features

- **Modern React 19** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for utility-first styling
- **Vitest** for unit testing with 100% test coverage
- **Cypress** for end-to-end testing
- **Storybook** for component documentation
- **Accessibility** compliant with WCAG 2.1 guidelines
- **Responsive design** for all device sizes
- **AI-powered features** for project management
- **Real-time collaboration** tools

## 📦 Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4.0
- **Testing**: Vitest + Testing Library
- **E2E Testing**: Cypress
- **Component Documentation**: Storybook
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod
- **UI Components**: Headless UI + Heroicons
- **Notifications**: Sonner
- **Error Tracking**: Sentry

## 🛠️ Development

### Prerequisites

- Node.js 20+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run Cypress tests
npm run cypress:run
```

### Storybook

```bash
# Start Storybook
npm run storybook

# Build Storybook
npm run build-storybook
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint -- --fix
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/            # Base UI components
│   ├── dashboard/     # Dashboard-specific components
│   ├── landing/       # Landing page components
│   ├── forms/         # Form components
│   └── modals/        # Modal components
├── pages/             # Page components
│   ├── auth/          # Authentication pages
│   ├── dashboard/     # Dashboard pages
│   └── projects/      # Project pages
├── hooks/             # Custom React hooks
├── stores/            # Zustand state stores
├── services/          # API and external services
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── styles/            # Global styles and design tokens
└── test/              # Test utilities and setup
```

## 🎨 Design System

The application uses a comprehensive design system with:

- **Design Tokens**: Centralized colors, typography, spacing, and shadows
- **Component Library**: Reusable UI components with Storybook documentation
- **Accessibility**: WCAG 2.1 compliant components
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### Key Components

- **Button**: Multiple variants, sizes, and states
- **Form**: Flexible form components with validation
- **LoadingSpinner**: Customizable loading indicators
- **ProjectCard**: Project display with status indicators
- **Modal**: Accessible modal dialogs

## 🧪 Testing Strategy

### Unit Testing
- **Vitest** for fast unit testing
- **Testing Library** for component testing
- **100% test coverage** on critical components
- **Accessibility testing** with jest-axe

### E2E Testing
- **Cypress** for end-to-end testing
- **Accessibility testing** in E2E flows
- **Cross-browser testing** support

### Test Structure
```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
└── fixtures/         # Test data and fixtures
```

## 🚀 Deployment

### Railway Deployment

The application is configured for deployment on Railway with:

- **Automatic deployments** from main branch
- **Environment variables** management
- **Health checks** and monitoring
- **SSL certificates** and custom domains

### Build Process

1. **Type checking** with TypeScript
2. **Linting** with ESLint
3. **Testing** with Vitest
4. **Building** with Vite
5. **Deployment** to Railway

## 📊 Performance

- **Lighthouse Score**: 95+ across all metrics
- **Accessibility**: 100% WCAG 2.1 compliance
- **Best Practices**: 100% score
- **SEO**: Optimized for search engines

## 🔧 Configuration

### Environment Variables

```env
VITE_API_BASE_URL=https://api.zephix.com
VITE_SENTRY_DSN=your-sentry-dsn
VITE_APP_ENV=production
```

### Build Configuration

- **Vite** for fast builds
- **Tailwind CSS** for optimized styles
- **TypeScript** for type safety
- **ESLint** for code quality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run the test suite
6. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Maintain accessibility standards
- Use the design system components
- Document new components in Storybook

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation in Storybook
- Review the test examples for usage patterns

---

**Built with ❤️ using modern web technologies**
# Deploy trigger
