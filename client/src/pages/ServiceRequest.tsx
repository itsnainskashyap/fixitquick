import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, Send, Lightbulb } from 'lucide-react';

const serviceRequestSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(100, 'Service name cannot exceed 100 characters'),
  description: z.string().min(10, 'Please provide at least 10 characters description').max(500, 'Description cannot exceed 500 characters'),
  categoryId: z.string().min(1, 'Please select a category'),
  estimatedPrice: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  contactInfo: z.string().min(1, 'Contact information is required').max(100, 'Contact info cannot exceed 100 characters'),
  location: z.string().optional()
});

type ServiceRequestData = z.infer<typeof serviceRequestSchema>;

export default function ServiceRequest() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<ServiceRequestData>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      name: '',
      description: '',
      categoryId: '',
      estimatedPrice: '',
      urgency: 'medium',
      contactInfo: '',
      location: ''
    }
  });

  // Fetch categories for the dropdown
  const { data: categories } = useQuery({
    queryKey: ['/api/v1/service-categories'],
    queryFn: () => fetch('/api/v1/service-categories').then(res => res.json())
  });

  const submitRequestMutation = useMutation({
    mutationFn: async (data: ServiceRequestData) => {
      return apiRequest('/api/v1/service-requests', 'POST', data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Service Request Submitted!",
        description: "Thank you for your suggestion. We'll review it and get back to you soon.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ServiceRequestData) => {
    submitRequestMutation.mutate(data);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Request Submitted Successfully!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed">
                Thank you for your service suggestion! Our team will review your request and contact you within 2-3 business days.
              </p>
              <div className="space-y-4">
                <Button 
                  onClick={() => setSubmitted(false)} 
                  variant="outline" 
                  className="mr-4"
                  data-testid="button-submit-another"
                >
                  Submit Another Request
                </Button>
                <Button 
                  onClick={() => window.location.href = '/'} 
                  data-testid="button-back-home"
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Request a New Service
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Can't find the service you need? Let us know and we'll work to add it to our platform!
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-gray-900 dark:text-white">Service Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> This form is for requesting new services to be added to our platform. 
                If you need an existing service, please browse our current offerings.
              </AlertDescription>
            </Alert>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-200">Service Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Mobile Phone Screen Repair, Garden Landscaping" 
                          {...field}
                          data-testid="input-service-name"
                          className="bg-white dark:bg-gray-700"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-200">Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category" className="bg-white dark:bg-gray-700">
                            <SelectValue placeholder="Select the most relevant category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.filter((cat: any) => cat.level === 0).map((category: any) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-200">Service Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the service in detail - what it includes, how it works, what tools/skills are needed..."
                          rows={4}
                          {...field}
                          data-testid="textarea-description"
                          className="bg-white dark:bg-gray-700"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-200">Estimated Price Range</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., ₹500-1000" 
                            {...field}
                            data-testid="input-estimated-price"
                            className="bg-white dark:bg-gray-700"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-200">Urgency Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-urgency" className="bg-white dark:bg-gray-700">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low - Nice to have</SelectItem>
                            <SelectItem value="medium">Medium - Moderately needed</SelectItem>
                            <SelectItem value="high">High - Urgently needed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="contactInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-200">Contact Information *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Email or phone number for follow-up" 
                          {...field}
                          data-testid="input-contact-info"
                          className="bg-white dark:bg-gray-700"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-200">Location/Area</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="City or area where you need this service" 
                          {...field}
                          data-testid="input-location"
                          className="bg-white dark:bg-gray-700"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg"
                    disabled={submitRequestMutation.isPending}
                    data-testid="button-submit-request"
                  >
                    {submitRequestMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Submitting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        Submit Service Request
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>Your request will be reviewed by our team and we'll contact you within 2-3 business days.</p>
        </div>
      </div>
    </div>
  );
}