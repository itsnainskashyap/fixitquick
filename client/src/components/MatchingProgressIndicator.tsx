import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Users, 
  MapPin, 
  Timer, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  Clock,
  Target,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CountdownTimer from '@/components/CountdownTimer';

interface MatchingProgressProps {
  status: string;
  currentSearchRadius?: number;
  searchWave?: number;
  pendingOffers?: number;
  matchingExpiresAt?: string;
  radiusExpansionHistory?: Array<{
    wave: number;
    radius: number;
    providersFound: number;
    expandedAt: string;
  }>;
  onMatchingExpired?: () => void;
  className?: string;
}

const RADIUS_EXPANSION_SCHEDULE = [
  { wave: 1, radius: 15, description: "Nearby area" },
  { wave: 2, radius: 25, description: "Extended area" },
  { wave: 3, radius: 30, description: "Wider search" },
  { wave: 4, radius: 35, description: "Broader reach" },
  { wave: 5, radius: 50, description: "Maximum coverage" }
];

export function MatchingProgressIndicator({
  status,
  currentSearchRadius = 15,
  searchWave = 1,
  pendingOffers = 0,
  matchingExpiresAt,
  radiusExpansionHistory = [],
  onMatchingExpired,
  className
}: MatchingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<'searching' | 'expanding' | 'found' | 'expired'>('searching');

  // Calculate progress based on search wave and status
  useEffect(() => {
    if (status === 'provider_assigned' || status === 'provider_on_way') {
      setProgress(100);
      setCurrentPhase('found');
    } else if (status === 'cancelled') {
      setProgress(0);
      setCurrentPhase('expired');
    } else if (status === 'provider_search') {
      // Progress based on search wave (each wave represents 20% progress)
      const waveProgress = Math.min((searchWave - 1) * 20, 80);
      setProgress(waveProgress + (pendingOffers > 0 ? 10 : 0));
      setCurrentPhase(searchWave > 1 ? 'expanding' : 'searching');
    }
  }, [status, searchWave, pendingOffers]);

  const getCurrentSearchInfo = () => {
    const currentWaveInfo = RADIUS_EXPANSION_SCHEDULE.find(r => r.wave === searchWave) || RADIUS_EXPANSION_SCHEDULE[0];
    return currentWaveInfo;
  };

  const getProgressColor = () => {
    if (currentPhase === 'found') return 'bg-green-500';
    if (currentPhase === 'expired') return 'bg-red-500';
    if (currentPhase === 'expanding') return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusIcon = () => {
    switch (currentPhase) {
      case 'found':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'expanding':
        return <Target className="h-5 w-5 text-yellow-500 animate-pulse" />;
      default:
        return <Search className="h-5 w-5 text-blue-500 animate-pulse" />;
    }
  };

  const getPhaseDescription = () => {
    switch (currentPhase) {
      case 'found':
        return 'Provider found and assigned!';
      case 'expired':
        return 'Search expired - please try again';
      case 'expanding':
        return `Expanding search radius to ${currentSearchRadius}km...`;
      default:
        return 'Searching for available providers...';
    }
  };

  const searchInfo = getCurrentSearchInfo();

  return (
    <Card className={cn("border-2", className)} data-testid="matching-progress-indicator">
      <CardContent className="p-4 space-y-4">
        {/* Header with icon and countdown */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-sm" data-testid="progress-phase">
                {getPhaseDescription()}
              </h3>
              <p className="text-xs text-muted-foreground">
                Wave {searchWave} • {searchInfo.description}
              </p>
            </div>
          </div>
          
          {matchingExpiresAt && currentPhase !== 'found' && (
            <CountdownTimer
              expiresAt={matchingExpiresAt}
              onExpired={onMatchingExpired}
              size="sm"
              format="mm:ss"
              data-testid="matching-countdown"
            />
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Matching Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress 
            value={progress} 
            className="h-2" 
            data-testid="progress-bar"
          />
        </div>

        {/* Search Status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium" data-testid="current-radius">
                {currentSearchRadius}km radius
              </p>
              <p className="text-xs text-muted-foreground">Current search area</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium" data-testid="pending-offers">
                {pendingOffers} offers sent
              </p>
              <p className="text-xs text-muted-foreground">Waiting for responses</p>
            </div>
          </div>
        </div>

        {/* Search Waves Timeline */}
        {radiusExpansionHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Search Timeline</h4>
            <div className="space-y-1">
              {radiusExpansionHistory.map((wave, index) => (
                <div 
                  key={wave.wave} 
                  className="flex items-center space-x-2 text-xs"
                  data-testid={`search-wave-${wave.wave}`}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    wave.wave <= searchWave ? "bg-blue-500" : "bg-gray-300"
                  )} />
                  <span className={cn(
                    wave.wave <= searchWave ? "text-foreground" : "text-muted-foreground"
                  )}>
                    Wave {wave.wave}: {wave.radius}km • {wave.providersFound} providers found
                  </span>
                  <span className="text-muted-foreground ml-auto">
                    {new Date(wave.expandedAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        {currentPhase === 'searching' && searchWave < 5 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-2">
              <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Next expansion in ~1 minute
                </p>
                <p className="text-blue-600 dark:text-blue-400">
                  We'll expand search to {RADIUS_EXPANSION_SCHEDULE[searchWave]?.radius}km to find more providers
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Provider Response Status */}
        {pendingOffers > 0 && currentPhase !== 'found' && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start space-x-2">
              <Loader2 className="h-4 w-4 text-yellow-500 mt-0.5 animate-spin" />
              <div className="text-xs">
                <p className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                  Providers are reviewing your request
                </p>
                <p className="text-yellow-600 dark:text-yellow-400">
                  We've sent your job to {pendingOffers} qualified providers nearby
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {currentPhase === 'found' && (
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-green-700 dark:text-green-300 mb-1">
                  Perfect match found!
                </p>
                <p className="text-green-600 dark:text-green-400">
                  A qualified provider has accepted your request and will be there soon
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MatchingProgressIndicator;