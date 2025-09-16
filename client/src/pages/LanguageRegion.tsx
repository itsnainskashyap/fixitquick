import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { RegionSelector } from '@/components/RegionSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft,
  Globe,
  MapPin,
  Clock,
  IndianRupee,
  Save,
  Loader2,
  Languages,
  Calendar,
  Monitor
} from 'lucide-react';

// Language & Region preferences validation schema
const languageRegionSchema = z.object({
  language: z.string().min(1, 'Language is required'),
  country: z.string().min(1, 'Country is required'),
  region: z.string().min(1, 'Region is required'),
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  dateFormat: z.string().min(1, 'Date format is required'),
  timeFormat: z.enum(['12', '24']),
  unitSystem: z.enum(['metric', 'imperial']),
  autoDetectLocation: z.boolean(),
});

type LanguageRegionFormData = z.infer<typeof languageRegionSchema>;

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
];

const COUNTRIES = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
];

const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
];

const TIMEZONES = [
  { code: 'Asia/Kolkata', name: 'India Standard Time (IST)', offset: '+05:30' },
  { code: 'America/New_York', name: 'Eastern Time (ET)', offset: '-05:00' },
  { code: 'America/Los_Angeles', name: 'Pacific Time (PT)', offset: '-08:00' },
  { code: 'Europe/London', name: 'Greenwich Mean Time (GMT)', offset: '+00:00' },
];

const DATE_FORMATS = [
  { code: 'DD/MM/YYYY', name: 'DD/MM/YYYY (31/12/2023)', example: '31/12/2023' },
  { code: 'MM/DD/YYYY', name: 'MM/DD/YYYY (12/31/2023)', example: '12/31/2023' },
  { code: 'YYYY-MM-DD', name: 'YYYY-MM-DD (2023-12-31)', example: '2023-12-31' },
  { code: 'DD-MM-YYYY', name: 'DD-MM-YYYY (31-12-2023)', example: '31-12-2023' },
];

export default function LanguageRegion() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup
  const form = useForm<LanguageRegionFormData>({
    resolver: zodResolver(languageRegionSchema),
    defaultValues: {
      language: 'en',
      country: 'IN',
      region: 'New Delhi, Delhi',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24',
      unitSystem: 'metric',
      autoDetectLocation: true,
    },
  });

  // Fetch user preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['/api/v1/users/me/preferences/language-region'],
    enabled: !!user,
  });

  // Update form when preferences are loaded
  useEffect(() => {
    if (preferences && !form.formState.isDirty) {
      form.reset({
        language: (preferences as any)?.language || 'en',
        country: (preferences as any)?.country || 'IN',
        region: (preferences as any)?.region || 'New Delhi, Delhi',
        currency: (preferences as any)?.currency || 'INR',
        timezone: (preferences as any)?.timezone || 'Asia/Kolkata',
        dateFormat: (preferences as any)?.dateFormat || 'DD/MM/YYYY',
        timeFormat: (preferences as any)?.timeFormat || '24',
        unitSystem: (preferences as any)?.unitSystem || 'metric',
        autoDetectLocation: (preferences as any)?.autoDetectLocation ?? true,
      });
    }
  }, [preferences, form]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: LanguageRegionFormData) => {
      const response = await apiRequest('PATCH', '/api/v1/users/me/preferences/language-region', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/me/preferences/language-region'] });
      toast({
        title: "Preferences updated successfully",
        description: "Your language and region settings have been saved.",
      });
    },
    onError: (error: any) => {
      console.error('Preferences update error:', error);
      toast({
        title: "Failed to update preferences",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    setLocation('/account');
  };

  const handleSubmit = (data: LanguageRegionFormData) => {
    updatePreferencesMutation.mutate(data);
  };

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location detection.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // In a real app, you'd reverse geocode these coordinates
        toast({
          title: "Location detected",
          description: `Latitude: ${latitude.toFixed(2)}, Longitude: ${longitude.toFixed(2)}`,
        });
      },
      (error) => {
        toast({
          title: "Location detection failed",
          description: "Please enable location access or select manually.",
          variant: "destructive",
        });
      }
    );
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="pt-52 px-4 pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          
          <h1 className="text-2xl font-bold text-foreground">Language & Region</h1>
          <p className="text-muted-foreground">
            Customize your language, location, and regional preferences
          </p>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Language Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Languages className="w-5 h-5" />
                    <span>Language Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Choose your preferred language for the app interface
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Language</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-language">
                              <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LANGUAGES.map((language) => (
                              <SelectItem key={language.code} value={language.code}>
                                <div className="flex items-center space-x-2">
                                  <span>{language.flag}</span>
                                  <span>{language.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Location Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span>Location Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Set your country and region for relevant services
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-country">
                              <SelectValue placeholder="Select a country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                <div className="flex items-center space-x-2">
                                  <span>{country.flag}</span>
                                  <span>{country.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region/City</FormLabel>
                        <FormControl>
                          <div className="flex space-x-2">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger data-testid="select-region" className="flex-1">
                                <SelectValue placeholder="Select your city" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="New Delhi, Delhi">New Delhi, Delhi</SelectItem>
                                <SelectItem value="Mumbai, Maharashtra">Mumbai, Maharashtra</SelectItem>
                                <SelectItem value="Bangalore, Karnataka">Bangalore, Karnataka</SelectItem>
                                <SelectItem value="Hyderabad, Telangana">Hyderabad, Telangana</SelectItem>
                                <SelectItem value="Chennai, Tamil Nadu">Chennai, Tamil Nadu</SelectItem>
                                <SelectItem value="Pune, Maharashtra">Pune, Maharashtra</SelectItem>
                                <SelectItem value="Kolkata, West Bengal">Kolkata, West Bengal</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleDetectLocation}
                              data-testid="button-detect-location"
                            >
                              <Monitor className="w-4 h-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoDetectLocation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Auto-detect location</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Automatically detect your location for relevant services
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-auto-detect-location"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Format Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Format Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Configure how dates, times, and units are displayed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-currency">
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CURRENCIES.map((currency) => (
                                <SelectItem key={currency.code} value={currency.code}>
                                  <div className="flex items-center space-x-2">
                                    <span>{currency.symbol}</span>
                                    <span>{currency.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-timezone">
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIMEZONES.map((timezone) => (
                                <SelectItem key={timezone.code} value={timezone.code}>
                                  <div className="flex flex-col">
                                    <span>{timezone.name}</span>
                                    <span className="text-xs text-muted-foreground">{timezone.offset}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Format</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-date-format">
                                <SelectValue placeholder="Select date format" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DATE_FORMATS.map((format) => (
                                <SelectItem key={format.code} value={format.code}>
                                  <div className="flex flex-col">
                                    <span>{format.code}</span>
                                    <span className="text-xs text-muted-foreground">{format.example}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timeFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Format</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-time-format">
                                <SelectValue placeholder="Select time format" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="12">12-hour (2:30 PM)</SelectItem>
                              <SelectItem value="24">24-hour (14:30)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="unitSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit System</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-unit-system">
                              <SelectValue placeholder="Select unit system" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="metric">
                              <div className="flex flex-col">
                                <span>Metric</span>
                                <span className="text-xs text-muted-foreground">Kilometers, Celsius, etc.</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="imperial">
                              <div className="flex flex-col">
                                <span>Imperial</span>
                                <span className="text-xs text-muted-foreground">Miles, Fahrenheit, etc.</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-end pt-4"
            >
              <Button
                type="submit"
                disabled={updatePreferencesMutation.isPending}
                data-testid="button-save-preferences"
              >
                {updatePreferencesMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </Form>
      </main>

      <BottomNavigation />
    </div>
  );
}