# Zephix Landing Page - Dependency Installation Guide

## Required Dependencies

The landing page requires the following packages to be installed. Run these commands in your project directory:

### Core Dependencies

```bash
# Install required packages
npm install framer-motion@^11.0.0 \
  react-intersection-observer@^9.5.0 \
  react-hook-form@^7.48.0 \
  @hookform/resolvers@^3.3.2 \
  zod@^3.22.0 \
  clsx@^2.1.0 \
  @radix-ui/react-accordion@^1.1.2 \
  react-countup@^6.5.0 \
  @vercel/analytics@^1.1.0 \
  lucide-react@^0.294.0
```

### Development Dependencies (Optional but Recommended)

```bash
# Install dev dependencies for better development experience
npm install -D @types/react-intersection-observer \
  @types/react-countup \
  tailwindcss-animate@^1.0.7
```

## Package Versions Explained

- **framer-motion**: For smooth animations and transitions
- **react-intersection-observer**: For scroll-triggered animations
- **react-hook-form**: For form handling and validation
- **@hookform/resolvers**: For Zod schema validation integration
- **zod**: For runtime type validation
- **clsx**: For conditional CSS classes
- **@radix-ui/react-accordion**: For accessible FAQ accordion
- **react-countup**: For animated number counters
- **@vercel/analytics**: For analytics tracking
- **lucide-react**: For consistent icon system

## Post-Installation Steps

1. **Restart your development server** after installing dependencies
2. **Clear browser cache** if you experience any styling issues
3. **Check console** for any import errors

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Ensure all packages are installed correctly
2. **TypeScript errors**: Some packages may need type definitions
3. **Styling issues**: Make sure Tailwind CSS is properly configured

### Version Conflicts

If you encounter version conflicts:

```bash
# Check for outdated packages
npm outdated

# Update packages to latest compatible versions
npm update

# Or use npm-check-updates for major version updates
npx npm-check-updates -u
npm install
```

## Environment Setup

After installing dependencies, create a `.env.local` file with:

```env
VITE_API_URL=http://localhost:3001/api
VITE_GA_ID=your-google-analytics-id
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ANIMATIONS=true
```

## Performance Considerations

- **Bundle size**: All dependencies together add ~150KB to your bundle
- **Tree shaking**: Ensure your bundler supports tree shaking for unused code
- **Code splitting**: Components are lazy-loaded for better performance

## Support

If you encounter issues:

1. Check the [CHANGELOG-LANDING.md](./CHANGELOG-LANDING.md) for known issues
2. Verify all dependencies are installed correctly
3. Check browser console for error messages
4. Ensure your Node.js version is 16+ and npm is 8+


