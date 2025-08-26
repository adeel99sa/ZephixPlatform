import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LANDING_CONTENT } from '../../lib/constants';
import { fadeInUp, fadeInLeft, fadeInRight, staggerContainer, staggerItem } from '../../lib/animations';
import { trackCTAClick } from '../../lib/analytics';
import GradientButton from './shared/GradientButton';
import MetricCard from './MetricCard';
import AnimatedGrid from './shared/AnimatedGrid';

const Hero: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCTAClick = () => {
    trackCTAClick('early_access', 'hero');
    // Scroll to CTA section
    document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zephix-dark via-zephix-purple/20 to-zephix-dark" />
        
        {/* Animated grid pattern */}
        <AnimatedGrid 
          pattern="dots" 
          size="lg" 
          opacity={0.1} 
          speed="slow" 
          className="opacity-30"
        />
        
        {/* Floating orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-zephix-purple/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zephix-blue/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.1, 0.3]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center space-x-3"
            {...fadeInLeft}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-zephix-purple to-zephix-blue rounded-xl flex items-center justify-center">
              <span className="text-white text-xl font-bold">Z</span>
            </div>
            <span className="text-2xl font-bold text-white">Zephix</span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <motion.a
              href="#how-it-works"
              className="text-gray-300 hover:text-white transition-colors duration-200"
              {...staggerItem}
            >
              How it Works
            </motion.a>
            <motion.a
              href="#features"
              className="text-gray-300 hover:text-white transition-colors duration-200"
              {...staggerItem}
            >
              Features
            </motion.a>
            <motion.a
              href="#pricing"
              className="text-gray-300 hover:text-white transition-colors duration-200"
              {...staggerItem}
            >
              Pricing
            </motion.a>
            <motion.a
              href="/login"
              className="text-gray-300 hover:text-white transition-colors duration-200"
              {...staggerItem}
            >
              Sign In
            </motion.a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden absolute top-full left-0 right-0 bg-zephix-dark/95 backdrop-blur-xl border-t border-white/10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="p-6 space-y-4">
              <a href="#how-it-works" className="block text-gray-300 hover:text-white transition-colors duration-200">
                How it Works
              </a>
              <a href="#features" className="block text-gray-300 hover:text-white transition-colors duration-200">
                Features
              </a>
              <a href="#pricing" className="block text-gray-300 hover:text-white transition-colors duration-200">
                Pricing
              </a>
              <a href="/login" className="block text-gray-300 hover:text-white transition-colors duration-200">
                Sign In
              </a>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        <motion.div
          className="mb-16"
          {...staggerContainer}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center px-4 py-2 rounded-full bg-zephix-purple/20 border border-zephix-purple/30 text-zephix-purple text-sm font-medium mb-8 backdrop-blur-sm"
            {...staggerItem}
          >
            <span className="w-2 h-2 bg-zephix-purple rounded-full mr-2 animate-pulse" />
            AI-Powered Project Intelligence
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-8 leading-tight"
            {...staggerItem}
          >
            {LANDING_CONTENT.hero.headline.map((line, index) => (
              <span key={index} className="block">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {line}
                </span>
              </span>
            ))}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="text-xl md:text-2xl text-gray-400 max-w-4xl mx-auto mb-12 leading-relaxed"
            {...staggerItem}
          >
            {LANDING_CONTENT.hero.subheadline}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            {...staggerItem}
          >
            <GradientButton
              size="lg"
              onClick={handleCTAClick}
              ctaType="early_access"
              location="hero"
            >
              {LANDING_CONTENT.hero.cta}
            </GradientButton>
            <GradientButton
              variant="outline"
              size="lg"
              onClick={() => trackCTAClick('demo_request', 'hero')}
              ctaType="demo_request"
              location="hero"
            >
              Watch Demo
            </GradientButton>
          </motion.div>

          {/* CTA Subtext */}
          <motion.p
            className="text-sm text-gray-500"
            {...staggerItem}
          >
            {LANDING_CONTENT.hero.ctaSubtext}
          </motion.p>
        </motion.div>

        {/* Metrics Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          {...staggerContainer}
        >
          <motion.div {...staggerItem}>
            <MetricCard
              icon={LANDING_CONTENT.metrics.conflicts.icon}
              value={LANDING_CONTENT.metrics.conflicts.value}
              label={LANDING_CONTENT.metrics.conflicts.label}
              delay={0}
            />
          </motion.div>
          <motion.div {...staggerItem}>
            <MetricCard
              icon={LANDING_CONTENT.metrics.detection.icon}
              value={LANDING_CONTENT.metrics.detection.value}
              label={LANDING_CONTENT.metrics.detection.label}
              unit={LANDING_CONTENT.metrics.detection.unit}
              delay={0.2}
            />
          </motion.div>
          <motion.div {...staggerItem}>
            <MetricCard
              icon={LANDING_CONTENT.metrics.accuracy.icon}
              value={LANDING_CONTENT.metrics.accuracy.value}
              label={LANDING_CONTENT.metrics.accuracy.label}
              unit={LANDING_CONTENT.metrics.accuracy.unit}
              isRange={true}
              startRange={55}
              endRange={65}
              delay={0.4}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <motion.div
            className="w-1 h-3 bg-white/50 rounded-full mt-2"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
