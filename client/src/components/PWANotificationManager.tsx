import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWANotifications } from '@/hooks/usePWANotifications';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  Shield, 
  Smartphone, 
  Zap, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Settings,
  TestTube,
  RefreshCw,
  Volume2,
  VolumeX,
  Clock,
  TrendingUp,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PWANotificationManagerProps {
  className?: string;
  compact?: boolean;
  showSetupWizard?: boolean;
}

export function PWANotificationManager({ 
  className = '', 
  compact = false, 
  showSetupWizard = false 
}: PWANotificationManagerProps) {
  const { user } = useAuth();
  const {
    permissionState,
    preferences,
    stats,
    isLoading,
    error,
    requestNotificationPermission,
    disableNotifications,
    updatePreferences,
    testNotification,
    retrySetup,
    isEnabled,
    canRequestPermission,
    isSupported
  } = usePWANotifications();

  const [showSetupDialog, setShowSetupDialog] = useState(showSetupWizard);
  const [setupStep, setSetupStep] = useState(0);

  const providerType = user?.role === 'parts_provider' ? 'Parts Provider' : 'Service Provider';
  const businessBenefits = {
    'service_provider': [
      'Never miss a job request - get instant alerts',
      'Respond faster and accept more jobs',
      'Higher earnings with priority emergency requests',
      'Real-time customer messages and updates'
    ],
    'parts_provider': [
      'Instant alerts for new parts orders',
      'Low stock warnings to prevent lost sales',
      'Faster order processing and fulfillment',
      'Real-time inventory updates'
    ]
  };

  const getBenefits = () => {
    return businessBenefits[user?.role as keyof typeof businessBenefits] || businessBenefits.service_provider;
  };

  const getPermissionIcon = () => {
    switch (permissionState.status) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'unsupported':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPermissionStatus = () => {
    switch (permissionState.status) {
      case 'granted':
        return { text: 'Enabled', color: 'green' };
      case 'denied':
        return { text: 'Blocked', color: 'red' };
      case 'unsupported':
        return { text: 'Unsupported', color: 'yellow' };
      default:
        return { text: 'Not Set', color: 'gray' };
    }
  };

  const handleEnableNotifications = async () => {
    const success = await requestNotificationPermission(true);
    if (success) {
      await updatePreferences({ ...preferences, enabled: true });
      setShowSetupDialog(false);
    }
  };

  const SetupWizard = () => (
    <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-blue-500" />
            Enable Instant Notifications
          </DialogTitle>
          <DialogDescription>
            Never miss business opportunities again
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {setupStep === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                <div className="text-center">
                  <Smartphone className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <h3 className="font-semibold">{providerType} Benefits</h3>
                </div>
              </div>

              <ul className="space-y-2">
                {getBenefits().map((benefit, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{benefit}</span>
                  </motion.li>
                ))}
              </ul>

              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  Your privacy is protected. We only send business-critical notifications and you can customize them anytime.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  onClick={() => setSetupStep(1)}
                  className="flex-1"
                  data-testid="button-setup-continue"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Enable Notifications
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSetupDialog(false)}
                  data-testid="button-setup-skip"
                >
                  Skip
                </Button>
              </div>
            </motion.div>
          )}

          {setupStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-center">
                <Bell className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                <h3 className="font-semibold">Browser Permission Required</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Allow" when your browser asks for notification permission
                </p>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  If you don't see a permission prompt, notifications may be blocked. 
                  Check your browser settings and look for a notification icon in the address bar.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="w-full"
                data-testid="button-request-permission"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Setting up...' : 'Request Permission'}
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Compact view for dashboard widgets
  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <SetupWizard />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPermissionIcon()}
            <span className="text-sm font-medium">PWA Notifications</span>
            <Badge variant={getPermissionStatus().color === 'green' ? 'default' : 'secondary'}>
              {getPermissionStatus().text}
            </Badge>
          </div>
          
          {!isEnabled && canRequestPermission && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSetupDialog(true)}
              data-testid="button-enable-compact"
            >
              Enable
            </Button>
          )}
        </div>

        {error && (
          <Alert className="p-2">
            <AlertCircle className="w-3 h-3" />
            <AlertDescription className="text-xs">
              {error}
              <Button
                size="sm"
                variant="ghost"
                onClick={retrySetup}
                className="ml-2 h-auto p-0 text-xs"
                data-testid="button-retry-compact"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isEnabled && (
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>📊 {stats.totalReceived} received</span>
              <span>⚡ {stats.totalActioned} actioned</span>
              {stats.lastReceived && (
                <span>🕒 {formatDistanceToNow(stats.lastReceived, { addSuffix: true })}</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full notification manager view
  return (
    <div className={`space-y-6 ${className}`}>
      <SetupWizard />
      
      <Card data-testid="pwa-notification-manager">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="w-5 h-5" />
            PWA Notifications
          </CardTitle>
          <CardDescription>
            Manage your browser notifications for instant business alerts
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
              {getPermissionIcon()}
              <div>
                <p className="text-sm font-medium">Permission Status</p>
                <p className="text-xs text-muted-foreground">{getPermissionStatus().text}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
              <Activity className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Notifications Received</p>
                <p className="text-xs text-muted-foreground">{stats.totalReceived} total</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Actions Taken</p>
                <p className="text-xs text-muted-foreground">{stats.totalActioned} responses</p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={retrySetup}
                  data-testid="button-retry-error"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Unsupported Browser */}
          {!isSupported && (
            <Alert>
              <WifiOff className="w-4 h-4" />
              <AlertDescription>
                Push notifications are not supported in this browser. Please use Chrome, Firefox, or Safari for the best experience.
              </AlertDescription>
            </Alert>
          )}

          {/* Main Actions */}
          <div className="flex gap-2">
            {!isEnabled && canRequestPermission && (
              <Button
                onClick={() => setShowSetupDialog(true)}
                disabled={isLoading}
                data-testid="button-enable-main"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Enable Notifications
              </Button>
            )}
            
            {isEnabled && (
              <>
                <Button
                  onClick={testNotification}
                  variant="outline"
                  data-testid="button-test-notification"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Notification
                </Button>
                
                <Button
                  onClick={disableNotifications}
                  variant="outline"
                  disabled={isLoading}
                  data-testid="button-disable-notifications"
                >
                  <BellOff className="w-4 h-4 mr-2" />
                  Disable
                </Button>
              </>
            )}
          </div>

          {/* Settings Tabs */}
          {isEnabled && (
            <Tabs defaultValue="preferences">
              <TabsList>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preferences" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="job-requests">Job/Order Notifications</Label>
                    <Switch
                      id="job-requests"
                      checked={preferences.jobRequests}
                      onCheckedChange={(checked) => updatePreferences({ jobRequests: checked })}
                      data-testid="switch-job-requests"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="customer-messages">Customer Messages</Label>
                    <Switch
                      id="customer-messages"
                      checked={preferences.customerMessages}
                      onCheckedChange={(checked) => updatePreferences({ customerMessages: checked })}
                      data-testid="switch-customer-messages"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payment-updates">Payment Updates</Label>
                    <Switch
                      id="payment-updates"
                      checked={preferences.paymentUpdates}
                      onCheckedChange={(checked) => updatePreferences({ paymentUpdates: checked })}
                      data-testid="switch-payment-updates"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emergency-alerts">Emergency Alerts</Label>
                    <Switch
                      id="emergency-alerts"
                      checked={preferences.emergencyAlerts}
                      onCheckedChange={(checked) => updatePreferences({ emergencyAlerts: checked })}
                      data-testid="switch-emergency-alerts"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sound-enabled" className="flex items-center gap-2">
                      {preferences.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      Sound Alerts
                    </Label>
                    <Switch
                      id="sound-enabled"
                      checked={preferences.soundEnabled}
                      onCheckedChange={(checked) => updatePreferences({ soundEnabled: checked })}
                      data-testid="switch-sound-enabled"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vibration-enabled">Vibration (Mobile)</Label>
                    <Switch
                      id="vibration-enabled"
                      checked={preferences.vibrationEnabled}
                      onCheckedChange={(checked) => updatePreferences({ vibrationEnabled: checked })}
                      data-testid="switch-vibration-enabled"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Quiet Hours
                    </Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={preferences.quietHours.enabled}
                        onCheckedChange={(checked) => updatePreferences({ 
                          quietHours: { ...preferences.quietHours, enabled: checked }
                        })}
                        data-testid="switch-quiet-hours"
                      />
                      {preferences.quietHours.enabled && (
                        <>
                          <Input
                            type="time"
                            value={preferences.quietHours.startTime}
                            onChange={(e) => updatePreferences({
                              quietHours: { ...preferences.quietHours, startTime: e.target.value }
                            })}
                            className="w-24"
                            data-testid="input-quiet-start"
                          />
                          <span className="text-sm text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={preferences.quietHours.endTime}
                            onChange={(e) => updatePreferences({
                              quietHours: { ...preferences.quietHours, endTime: e.target.value }
                            })}
                            className="w-24"
                            data-testid="input-quiet-end"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="stats" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-accent/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">{stats.totalReceived}</div>
                    <div className="text-sm text-muted-foreground">Total Received</div>
                  </div>
                  
                  <div className="text-center p-4 bg-accent/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{stats.totalActioned}</div>
                    <div className="text-sm text-muted-foreground">Actions Taken</div>
                  </div>
                  
                  <div className="text-center p-4 bg-accent/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-500">
                      {stats.totalReceived > 0 ? Math.round((stats.totalActioned / stats.totalReceived) * 100) : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Response Rate</div>
                  </div>
                  
                  <div className="text-center p-4 bg-accent/50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-500">
                      {stats.averageResponseTime > 0 ? `${Math.round(stats.averageResponseTime / 1000)}s` : '--'}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                  </div>
                </div>
                
                {stats.lastReceived && (
                  <div className="text-center text-sm text-muted-foreground">
                    Last notification: {formatDistanceToNow(stats.lastReceived, { addSuffix: true })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PWANotificationManager;