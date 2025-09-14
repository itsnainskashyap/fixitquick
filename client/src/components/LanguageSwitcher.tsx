import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Check, Globe, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getSupportedLanguages, changeLanguage, getCurrentLanguage } from '@/lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'minimal';
  showFlag?: boolean;
  className?: string;
  dropdownAlign?: 'left' | 'right' | 'center';
}

interface Language {
  code: string;
  name: string;
  isRTL: boolean;
}

const I18N_ENABLED = import.meta.env.VITE_I18N_ENABLED === 'true';

// Implementation component (only loaded when i18n is enabled)
export function LanguageSwitcherImpl({ 
  variant = 'default', 
  showFlag = true, 
  className,
  dropdownAlign = 'right'
}: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState<Language[]>([]);
  const [currentLang, setCurrentLang] = useState<string>('');

  // Initialize supported languages and current language
  useEffect(() => {
    const languages = getSupportedLanguages();
    setSupportedLanguages(languages);
    setCurrentLang(getCurrentLanguage());
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLang(lng);
      setIsLoading(false);
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => i18n.off('languageChanged', handleLanguageChange);
  }, [i18n]);

  // Get language display information
  const getLanguageInfo = (code: string) => {
    const language = supportedLanguages.find(lang => lang.code === code);
    
    switch (code) {
      case 'hi':
        return {
          name: 'हिंदी',
          englishName: 'Hindi',
          flag: '🇮🇳',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20'
        };
      case 'en':
        return {
          name: 'English',
          englishName: 'English',
          flag: '🇺🇸',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20'
        };
      case 'mr':
        return {
          name: 'मराठी',
          englishName: 'Marathi',
          flag: '🇮🇳',
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20'
        };
      case 'bn':
        return {
          name: 'বাংলা',
          englishName: 'Bengali',
          flag: '🇮🇳',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
        };
      case 'ta':
        return {
          name: 'தமிழ்',
          englishName: 'Tamil',
          flag: '🇮🇳',
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20'
        };
      default:
        return {
          name: language?.name || code.toUpperCase(),
          englishName: language?.name || code.toUpperCase(),
          flag: '🌐',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20'
        };
    }
  };

  const currentLanguageInfo = getLanguageInfo(currentLang);

  // Handle language change
  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === currentLang) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(false);
    
    try {
      await changeLanguage(languageCode);
      
      // Save to localStorage for persistence
      localStorage.setItem('fixitquick_language', languageCode);
      
      // Optional: Send to backend to update user preferences
      if (typeof window !== 'undefined' && window.fetch) {
        try {
          await fetch('/api/v1/user/preferences/language', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ language: languageCode }),
            credentials: 'include',
          }).catch(() => {
            // Silently fail - user preference sync is not critical
            console.log('Language preference sync skipped');
          });
        } catch (error) {
          // Silently fail - offline or backend unavailable
        }
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      setIsLoading(false);
    }
  };

  // Render minimal variant (just the flag/icon)
  if (variant === 'minimal') {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-8 w-8 p-0 hover:bg-muted rounded-full transition-colors",
            currentLanguageInfo.bgColor,
            className
          )}
          data-testid="language-switcher-minimal"
        >
          {isLoading ? (
            <Skeleton className="h-4 w-4 rounded-full" />
          ) : (
            <span className="text-sm" role="img" aria-label={`Current language: ${currentLanguageInfo.englishName}`}>
              {showFlag ? currentLanguageInfo.flag : <Languages className="h-4 w-4" />}
            </span>
          )}
        </Button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "absolute top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-2 z-50",
                  dropdownAlign === 'left' && 'left-0',
                  dropdownAlign === 'right' && 'right-0',
                  dropdownAlign === 'center' && 'left-1/2 -translate-x-1/2'
                )}
                data-testid="language-dropdown"
              >
                {supportedLanguages.map((language, index) => {
                  const langInfo = getLanguageInfo(language.code);
                  const isSelected = language.code === currentLang;
                  
                  return (
                    <motion.button
                      key={language.code}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleLanguageChange(language.code)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                        "hover:bg-muted focus:bg-muted focus:outline-none",
                        isSelected && "bg-primary/10 text-primary font-medium"
                      )}
                      data-testid={`language-option-${language.code}`}
                    >
                      <div className="flex items-center space-x-3">
                        {showFlag && (
                          <span className="text-base" role="img" aria-hidden="true">
                            {langInfo.flag}
                          </span>
                        )}
                        <div className="text-left">
                          <div className="font-medium">{langInfo.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {langInfo.englishName}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
              
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render compact variant
  if (variant === 'compact') {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center space-x-2 h-8 px-2 transition-colors",
            currentLanguageInfo.bgColor,
            "border-primary/20 hover:border-primary/40",
            className
          )}
          disabled={isLoading}
          data-testid="language-switcher-compact"
        >
          {isLoading ? (
            <Skeleton className="h-4 w-12" />
          ) : (
            <>
              {showFlag && (
                <span className="text-sm" role="img" aria-label={currentLanguageInfo.englishName}>
                  {currentLanguageInfo.flag}
                </span>
              )}
              <span className="text-sm font-medium">
                {currentLang.toUpperCase()}
              </span>
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform",
                isOpen && "rotate-180"
              )} />
            </>
          )}
        </Button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "absolute top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-2 z-50",
                  dropdownAlign === 'left' && 'left-0',
                  dropdownAlign === 'right' && 'right-0',
                  dropdownAlign === 'center' && 'left-1/2 -translate-x-1/2'
                )}
                data-testid="language-dropdown"
              >
                {supportedLanguages.map((language, index) => {
                  const langInfo = getLanguageInfo(language.code);
                  const isSelected = language.code === currentLang;
                  
                  return (
                    <motion.button
                      key={language.code}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleLanguageChange(language.code)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                        "hover:bg-muted focus:bg-muted focus:outline-none",
                        isSelected && "bg-primary/10 text-primary font-medium"
                      )}
                      data-testid={`language-option-${language.code}`}
                    >
                      <div className="flex items-center space-x-3">
                        {showFlag && (
                          <span className="text-base" role="img" aria-hidden="true">
                            {langInfo.flag}
                          </span>
                        )}
                        <div className="text-left">
                          <div className="font-medium">{langInfo.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {langInfo.englishName}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
              
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render default variant
  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-2 h-9 px-3 transition-colors",
          currentLanguageInfo.bgColor,
          "border-primary/20 hover:border-primary/40",
          className
        )}
        disabled={isLoading}
        data-testid="language-switcher-default"
      >
        {isLoading ? (
          <Skeleton className="h-4 w-20" />
        ) : (
          <>
            {showFlag && (
              <span className="text-base" role="img" aria-label={currentLanguageInfo.englishName}>
                {currentLanguageInfo.flag}
              </span>
            )}
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {currentLanguageInfo.name}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {currentLanguageInfo.englishName}
              </span>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform ml-2",
              isOpen && "rotate-180"
            )} />
          </>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-2 z-50",
                dropdownAlign === 'left' && 'left-0',
                dropdownAlign === 'right' && 'right-0',
                dropdownAlign === 'center' && 'left-1/2 -translate-x-1/2'
              )}
              data-testid="language-dropdown"
            >
              <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>{t('language.select')}</span>
                </div>
              </div>
              
              {supportedLanguages.map((language, index) => {
                const langInfo = getLanguageInfo(language.code);
                const isSelected = language.code === currentLang;
                
                return (
                  <motion.button
                    key={language.code}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleLanguageChange(language.code)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-3 text-sm transition-colors",
                      "hover:bg-muted focus:bg-muted focus:outline-none",
                      isSelected && "bg-primary/10 text-primary font-medium"
                    )}
                    data-testid={`language-option-${language.code}`}
                  >
                    <div className="flex items-center space-x-3">
                      {showFlag && (
                        <span className="text-lg" role="img" aria-hidden="true">
                          {langInfo.flag}
                        </span>
                      )}
                      <div className="text-left">
                        <div className="font-medium text-base">
                          {langInfo.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {langInfo.englishName}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
            
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple error boundary component
class LanguageSwitcherErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LanguageSwitcher error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Lazy load the implementation component
const LanguageSwitcherLazy = lazy(() => 
  Promise.resolve({ default: LanguageSwitcherImpl })
);

// Error fallback component
function LanguageSwitcherError() {
  return (
    <div className="text-xs text-muted-foreground px-2 py-1 rounded">
      Language unavailable
    </div>
  );
}

// Loading fallback component
function LanguageSwitcherLoading({ variant }: { variant?: string }) {
  const getSkeletonSize = () => {
    switch (variant) {
      case 'minimal':
        return 'h-8 w-8';
      case 'compact':
        return 'h-8 w-16';
      default:
        return 'h-9 w-32';
    }
  };

  return (
    <Skeleton 
      className={`${getSkeletonSize()} rounded-md`}
      data-testid="language-switcher-loading"
    />
  );
}

// Main wrapper component that handles lazy loading and feature flag
export function LanguageSwitcher(props: LanguageSwitcherProps) {
  // If i18n is disabled, render a placeholder or nothing
  if (!I18N_ENABLED) {
    // Return a minimal placeholder that matches the expected space
    if (props.variant === 'minimal') {
      return null; // Completely hidden for minimal variant
    }
    
    return (
      <div 
        className={`text-xs text-muted-foreground px-2 py-1 ${props.className || ''}`}
        data-testid="language-switcher-disabled"
      >
        {/* TODO: Enable i18n by setting VITE_I18N_ENABLED=true */}
      </div>
    );
  }

  // If i18n is enabled, lazy load the actual implementation
  return (
    <LanguageSwitcherErrorBoundary fallback={<LanguageSwitcherError />}>
      <Suspense fallback={<LanguageSwitcherLoading variant={props.variant} />}>
        <LanguageSwitcherLazy {...props} />
      </Suspense>
    </LanguageSwitcherErrorBoundary>
  );
}

// Export type for props
export type { LanguageSwitcherProps };