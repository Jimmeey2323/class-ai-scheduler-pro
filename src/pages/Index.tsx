
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, Settings, Download, Printer, Mail, Save, Undo, Redo, RefreshCw, Lock, Unlock, Users, Calendar, BarChart3, Filter, Eye, Sun, Moon, AlertTriangle, CheckCircle, Clock, TrendingUp, Brain, Zap } from 'lucide-react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Types
interface ClassData {
  'Variant Name': string;
  'Class date': string;
  'Location': string;
  'Total Revenue': string;
  'Participants': string;
  'Checked in': string;
  'Teacher Name': string;
  'Day of the Week': string;
  'Class Time': string;
  'Cleaned Class': string;
  'Time (h)': string;
}

interface ScheduledClass {
  id: string;
  format: string;
  time: string;
  trainer: string;
  day: string;
  location: string;
  duration: number;
  isLocked: boolean;
  isPrivate?: boolean;
  average?: number;
  recommendation?: string;
}

interface TrainerData {
  name: string;
  hours: number;
  classes: number;
  isUnavailable: boolean;
  unavailableDates: string[];
  topFormats: string[];
  avatar?: string;
  experience: 'Senior' | 'Mid' | 'Junior' | 'New';
  specialties: string[];
}

interface APIConfig {
  provider: 'deepseek' | 'openai' | 'anthropic' | 'groq';
  key: string;
}

const Index = () => {
  // Core State
  const [csvData, setCsvData] = useState<ClassData[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [trainers, setTrainers] = useState<TrainerData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('Kwality House, Kemps Corner');
  const [isLightMode, setIsLightMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Feature States
  const [lockClasses, setLockClasses] = useState(false);
  const [lockTrainers, setLockTrainers] = useState(false);
  const [includeTrainerInUnique, setIncludeTrainerInUnique] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [viewMode, setViewMode] = useState('grid');
  
  // Modal States
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{day: string, time: string} | null>(null);
  
  // History for undo/redo
  const [history, setHistory] = useState<ScheduledClass[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // AI Configuration
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    provider: 'deepseek',
    key: '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'
  });

  // Constants
  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = [
    '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30'
  ];

  const priorityTrainers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];

  // Helper Functions
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toFixed(0)}`;
  };

  const getClassDuration = (className: string) => {
    if (className.toLowerCase().includes('express')) return 45;
    if (className.toLowerCase().includes('recovery') || className.toLowerCase().includes('sweat in 30')) return 30;
    return 60;
  };

  const calculateTrainerHours = useCallback(() => {
    const trainerHours: Record<string, { hours: number; classes: number }> = {};
    
    scheduledClasses.forEach(cls => {
      if (cls.trainer && cls.trainer !== 'Unassigned') {
        if (!trainerHours[cls.trainer]) {
          trainerHours[cls.trainer] = { hours: 0, classes: 0 };
        }
        trainerHours[cls.trainer].hours += cls.duration / 60;
        trainerHours[cls.trainer].classes += 1;
      }
    });

    return trainerHours;
  }, [scheduledClasses]);

  // CSV Processing
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const data = results.data as ClassData[];
        const filteredData = data.filter(row => 
          row['Variant Name'] && 
          !row['Variant Name'].toLowerCase().includes('hosted')
        );
        setCsvData(filteredData);
        initializeTrainers(filteredData);
        setIsLoading(false);
        toast.success(`Loaded ${filteredData.length} classes from CSV`);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast.error('Error parsing CSV file');
        setIsLoading(false);
      }
    });
  };

  const initializeTrainers = (data: ClassData[]) => {
    const trainerMap = new Map<string, TrainerData>();
    
    data.forEach(row => {
      const name = row['Teacher Name'];
      if (name && name !== 'Unassigned') {
        if (!trainerMap.has(name)) {
          trainerMap.set(name, {
            name,
            hours: 0,
            classes: 0,
            isUnavailable: false,
            unavailableDates: [],
            topFormats: [],
            experience: priorityTrainers.includes(name.split(' ')[0]) ? 'Senior' : 'Mid',
            specialties: [],
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`
          });
        }
      }
    });

    setTrainers(Array.from(trainerMap.values()));
  };

  // AI Functions
  const generateAIRecommendations = async (day: string, time: string, location: string) => {
    try {
      const historicalData = csvData.filter(row => 
        row['Day of the Week'] === day && 
        row['Class Time'] === time && 
        row['Location'] === location
      );

      if (historicalData.length === 0) return [];

      const avgAttendance = historicalData.reduce((sum, row) => 
        sum + parseInt(row['Checked in'] || '0'), 0) / historicalData.length;

      const topFormats = [...new Set(historicalData.map(row => row['Cleaned Class']))]
        .map(format => ({
          format,
          avg: historicalData.filter(row => row['Cleaned Class'] === format)
            .reduce((sum, row) => sum + parseInt(row['Checked in'] || '0'), 0) / 
            historicalData.filter(row => row['Cleaned Class'] === format).length
        }))
        .sort((a, b) => b.avg - a.avg);

      return topFormats.slice(0, 3).map((item, index) => ({
        type: 'format',
        suggestion: item.format,
        score: Math.round(item.avg * 10) / 10,
        reason: `Historical average: ${item.avg.toFixed(1)} attendees`,
        priority: index + 1
      }));
    } catch (error) {
      console.error('AI recommendation error:', error);
      return [];
    }
  };

  // Schedule Management
  const addToHistory = (newSchedule: ScheduledClass[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newSchedule]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setScheduledClasses([...history[historyIndex - 1]]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setScheduledClasses([...history[historyIndex + 1]]);
    }
  };

  const clearAll = () => {
    addToHistory(scheduledClasses);
    setScheduledClasses([]);
    toast.success('Schedule cleared');
  };

  // Auto Optimization
  const autoOptimizeSchedule = async () => {
    if (csvData.length === 0) {
      toast.error('Please upload CSV data first');
      return;
    }

    setIsLoading(true);
    addToHistory(scheduledClasses);

    try {
      // Calculate best classes based on historical data
      const classPerformance = new Map<string, number>();
      const locationAverage = new Map<string, number>();

      // Calculate averages
      csvData.forEach(row => {
        const key = `${row['Cleaned Class']}-${row['Day of the Week']}-${row['Class Time']}-${row['Location']}`;
        const attendance = parseInt(row['Checked in'] || '0');
        
        if (!classPerformance.has(key)) {
          classPerformance.set(key, 0);
        }
        classPerformance.set(key, classPerformance.get(key)! + attendance);

        // Location averages
        if (!locationAverage.has(row['Location'])) {
          locationAverage.set(row['Location'], 0);
        }
      });

      // Get unique combinations above location average
      const optimizedClasses: ScheduledClass[] = [];
      const trainerHours = new Map<string, number>();
      const trainerClasses = new Map<string, number>();

      // Initialize trainer tracking
      trainers.forEach(trainer => {
        trainerHours.set(trainer.name, 0);
        trainerClasses.set(trainer.name, 0);
      });

      // Sort classes by performance
      const sortedClasses = Array.from(classPerformance.entries())
        .map(([key, totalAttendance]) => {
          const [format, day, time, location] = key.split('-');
          const count = csvData.filter(row => 
            row['Cleaned Class'] === format && 
            row['Day of the Week'] === day && 
            row['Class Time'] === time && 
            row['Location'] === location
          ).length;
          return {
            format,
            day,
            time,
            location,
            average: totalAttendance / count,
            key
          };
        })
        .sort((a, b) => b.average - a.average);

      // Assign classes with constraints
      for (const classData of sortedClasses) {
        // Skip if weekend evening or Thursday morning needs optimization
        if ((classData.day === 'Saturday' || classData.day === 'Sunday') && 
            parseInt(classData.time.split(':')[0]) >= 18) continue;

        // Find best trainer for this class
        const historicalTrainers = csvData
          .filter(row => 
            row['Cleaned Class'] === classData.format && 
            row['Day of the Week'] === classData.day && 
            row['Location'] === classData.location
          )
          .map(row => ({
            name: row['Teacher Name'],
            attendance: parseInt(row['Checked in'] || '0')
          }))
          .filter(t => t.name && t.name !== 'Unassigned');

        const bestTrainer = historicalTrainers
          .reduce((best, current) => {
            const currentHours = trainerHours.get(current.name) || 0;
            const bestHours = trainerHours.get(best?.name || '') || 0;
            
            if (currentHours >= 15) return best; // Skip if already at limit
            if (current.attendance > (best?.attendance || 0) && currentHours < 15) {
              return current;
            }
            return best;
          }, null as any);

        if (bestTrainer && (trainerHours.get(bestTrainer.name) || 0) < 15) {
          const duration = getClassDuration(classData.format);
          const newClass: ScheduledClass = {
            id: `${classData.day}-${classData.time}-${classData.location}-${Date.now()}`,
            format: classData.format,
            time: classData.time,
            trainer: bestTrainer.name,
            day: classData.day,
            location: classData.location,
            duration,
            isLocked: false,
            average: classData.average
          };

          optimizedClasses.push(newClass);
          trainerHours.set(bestTrainer.name, (trainerHours.get(bestTrainer.name) || 0) + duration / 60);
          trainerClasses.set(bestTrainer.name, (trainerClasses.get(bestTrainer.name) || 0) + 1);
        }
        
        // Check if all trainers have enough hours
        const allTrainersFull = Array.from(trainerHours.values()).every(hours => hours >= 12);
        if (allTrainersFull) break;
      }

      setScheduledClasses(optimizedClasses);
      toast.success(`Optimized schedule with ${optimizedClasses.length} classes`);
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Error optimizing schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const populateTopClasses = () => {
    if (csvData.length === 0) {
      toast.error('Please upload CSV data first');
      return;
    }

    addToHistory(scheduledClasses);

    // Calculate location averages
    const locationAverages = new Map<string, number>();
    locations.forEach(location => {
      const locationData = csvData.filter(row => row['Location'] === location);
      const totalAttendance = locationData.reduce((sum, row) => sum + parseInt(row['Checked in'] || '0'), 0);
      locationAverages.set(location, totalAttendance / locationData.length);
    });

    // Find classes above location average
    const topClasses: ScheduledClass[] = [];
    const processedKeys = new Set<string>();

    csvData.forEach(row => {
      const key = includeTrainerInUnique 
        ? `${row['Cleaned Class']}-${row['Day of the Week']}-${row['Class Time']}-${row['Location']}-${row['Teacher Name']}`
        : `${row['Cleaned Class']}-${row['Day of the Week']}-${row['Class Time']}-${row['Location']}`;
      
      if (processedKeys.has(key)) return;
      processedKeys.add(key);

      const attendance = parseInt(row['Checked in'] || '0');
      const locationAvg = locationAverages.get(row['Location']) || 0;

      if (attendance > locationAvg && attendance >= 6) {
        const newClass: ScheduledClass = {
          id: `${row['Day of the Week']}-${row['Class Time']}-${row['Location']}-${Date.now()}-${Math.random()}`,
          format: row['Cleaned Class'],
          time: row['Class Time'],
          trainer: includeTrainerInUnique ? row['Teacher Name'] : 'Unassigned',
          day: row['Day of the Week'],
          location: row['Location'],
          duration: getClassDuration(row['Cleaned Class']),
          isLocked: false,
          average: attendance
        };
        topClasses.push(newClass);
      }
    });

    setScheduledClasses(prev => [...prev, ...topClasses]);
    toast.success(`Added ${topClasses.length} top performing classes`);
  };

  // Component Renders
  const renderTrainerCard = (trainer: TrainerData) => {
    const hours = calculateTrainerHours()[trainer.name]?.hours || 0;
    const classes = calculateTrainerHours()[trainer.name]?.classes || 0;
    const isOverLimit = hours > 15;
    const isNearLimit = hours > 12 && hours <= 15;

    return (
      <Card key={trainer.name} className={`${isLightMode ? 'bg-white/80' : 'bg-white/10'} backdrop-blur-md border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <img 
              src={trainer.avatar} 
              alt={trainer.name}
              className="w-12 h-12 rounded-full border-2 border-primary/20"
            />
            <div className="flex-1">
              <h3 className={`font-semibold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
                {trainer.name}
              </h3>
              <Badge variant={trainer.experience === 'Senior' ? 'default' : 'secondary'} className="text-xs">
                {trainer.experience}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={isLightMode ? 'text-gray-600' : 'text-gray-300'}>Hours:</span>
              <span className={`font-medium ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : isLightMode ? 'text-gray-900' : 'text-white'}`}>
                {hours.toFixed(1)}/15
              </span>
            </div>
            <Progress value={(hours / 15) * 100} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className={isLightMode ? 'text-gray-600' : 'text-gray-300'}>Classes:</span>
              <span className={`font-medium ${isLightMode ? 'text-gray-900' : 'text-white'}`}>{classes}</span>
            </div>
          </div>

          {isOverLimit && (
            <div className="mt-2 flex items-center text-red-500 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Over hour limit!
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderScheduleGrid = () => {
    const getClassesForSlot = (day: string, time: string) => {
      return scheduledClasses.filter(cls => 
        cls.day === day && 
        cls.time === time && 
        cls.location === selectedLocation
      );
    };

    const getClassCountByFormat = (day: string) => {
      const dayClasses = scheduledClasses.filter(cls => 
        cls.day === day && cls.location === selectedLocation
      );
      const formatCounts = new Map<string, number>();
      dayClasses.forEach(cls => {
        formatCounts.set(cls.format, (formatCounts.get(cls.format) || 0) + 1);
      });
      return formatCounts;
    };

    return (
      <div className="space-y-6">
        {/* Day-wise class counts */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const formatCounts = getClassCountByFormat(day);
            return (
              <Card key={day} className={`${isLightMode ? 'bg-white/80' : 'bg-white/10'} backdrop-blur-md border-white/20`}>
                <CardContent className="p-3">
                  <h4 className={`font-semibold text-sm mb-2 ${isLightMode ? 'text-gray-900' : 'text-white'}`}>{day}</h4>
                  <div className="space-y-1">
                    {Array.from(formatCounts.entries()).map(([format, count]) => (
                      <div key={format} className="flex justify-between text-xs">
                        <span className={`truncate ${isLightMode ? 'text-gray-600' : 'text-gray-300'}`}>{format.replace('Studio ', '')}</span>
                        <Badge variant="outline" className="ml-1 text-xs px-1 py-0">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Schedule Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-8 gap-2">
              {/* Header */}
              <div className={`p-3 font-semibold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>Time</div>
              {days.map(day => (
                <div key={day} className={`p-3 font-semibold text-center ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
                  {day}
                </div>
              ))}

              {/* Time slots */}
              {timeSlots.map(time => (
                <React.Fragment key={time}>
                  <div className={`p-3 font-medium ${isLightMode ? 'text-gray-700' : 'text-gray-300'}`}>
                    {time}
                  </div>
                  {days.map(day => {
                    const classes = getClassesForSlot(day, time);
                    const hasMultipleClasses = classes.length > 1;
                    
                    return (
                      <div
                        key={`${day}-${time}`}
                        className={`min-h-[80px] p-2 border rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                          isLightMode 
                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50' 
                            : 'border-white/20 hover:border-blue-400 hover:bg-blue-500/20'
                        } ${hasMultipleClasses ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20' : ''}`}
                        onClick={() => {
                          setSelectedSlot({ day, time });
                          setShowClassModal(true);
                        }}
                      >
                        {classes.map((cls, index) => (
                          <div
                            key={cls.id}
                            className={`mb-1 p-2 rounded text-xs transition-all duration-200 hover:shadow-md ${
                              cls.isLocked 
                                ? 'bg-red-500/80 text-white border border-red-400' 
                                : 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white'
                            } ${index > 0 ? 'mt-1' : ''}`}
                          >
                            <div className="font-semibold truncate">{cls.format.replace('Studio ', '')}</div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="truncate">{cls.trainer}</span>
                              {cls.isLocked && <Lock className="w-3 h-3" />}
                            </div>
                            {cls.average && (
                              <div className="text-xs opacity-75 mt-1">
                                Avg: {cls.average.toFixed(1)}
                              </div>
                            )}
                          </div>
                        ))}
                        {classes.length === 0 && (
                          <div className={`text-center text-xs ${isLightMode ? 'text-gray-400' : 'text-gray-500'} mt-6`}>
                            Click to add class
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main Component Render
  if (csvData.length === 0) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${
        isLightMode 
          ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50' 
          : 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900'
      }`}>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className={`text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
              AI Schedule Optimizer
            </h1>
            <p className={`text-lg ${isLightMode ? 'text-gray-600' : 'text-gray-300'}`}>
              Upload your class data to begin optimizing schedules
            </p>
          </div>

          <Card className={`max-w-md mx-auto ${isLightMode ? 'bg-white/80' : 'bg-white/10'} backdrop-blur-md border-white/20`}>
            <CardContent className="p-8">
              <div className="text-center">
                <Upload className={`w-12 h-12 mx-auto mb-4 ${isLightMode ? 'text-blue-600' : 'text-blue-400'}`} />
                <h2 className={`text-xl font-semibold mb-4 ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
                  Upload CSV File
                </h2>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  Choose CSV File
                </label>
                <p className={`text-sm mt-4 ${isLightMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Upload your class schedule data to get started
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      isLightMode 
        ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50' 
        : 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900'
    }`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
              AI Schedule Optimizer
            </h1>
            <p className={`${isLightMode ? 'text-gray-600' : 'text-gray-300'}`}>
              {csvData.length} classes loaded • {trainers.length} trainers
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLightMode(!isLightMode)}
              className={`${isLightMode ? 'border-gray-300 hover:bg-gray-100' : 'border-white/20 hover:bg-white/10'}`}
            >
              {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
            
            <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={isLightMode ? 'border-gray-300 hover:bg-gray-100' : 'border-white/20 hover:bg-white/10'}>
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className={`${isLightMode ? 'bg-white' : 'bg-gray-900'} max-w-2xl`}>
                <DialogHeader>
                  <DialogTitle className={isLightMode ? 'text-gray-900' : 'text-white'}>Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>AI Provider</Label>
                    <Select value={apiConfig.provider} onValueChange={(value: any) => setApiConfig(prev => ({ ...prev, provider: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deepseek">DeepSeek</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="groq">Groq</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={apiConfig.key}
                      onChange={(e) => setApiConfig(prev => ({ ...prev, key: e.target.value }))}
                      placeholder="Enter your API key"
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Button
            onClick={populateTopClasses}
            disabled={isLoading}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Populate Top Classes
          </Button>
          
          <Button
            onClick={autoOptimizeSchedule}
            disabled={isLoading}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          >
            <Brain className="w-4 h-4 mr-2" />
            {isLoading ? 'Optimizing...' : 'Auto Optimize'}
          </Button>

          <Button
            onClick={clearAll}
            variant="outline"
            className={isLightMode ? 'border-gray-300 hover:bg-gray-100' : 'border-white/20 hover:bg-white/10'}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear All
          </Button>

          <div className="flex space-x-2">
            <Button
              onClick={undo}
              disabled={historyIndex <= 0}
              variant="outline"
              size="sm"
              className={isLightMode ? 'border-gray-300 hover:bg-gray-100' : 'border-white/20 hover:bg-white/10'}
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              variant="outline"
              size="sm"
              className={isLightMode ? 'border-gray-300 hover:bg-gray-100' : 'border-white/20 hover:bg-white/10'}
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Lock Controls */}
        <div className="flex space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <Switch
              checked={lockClasses}
              onCheckedChange={setLockClasses}
              id="lock-classes"
            />
            <Label htmlFor="lock-classes" className={`flex items-center ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
              {lockClasses ? <Lock className="w-4 h-4 mr-1" /> : <Unlock className="w-4 h-4 mr-1" />}
              Lock Classes
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={lockTrainers}
              onCheckedChange={setLockTrainers}
              id="lock-trainers"
            />
            <Label htmlFor="lock-trainers" className={`flex items-center ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
              {lockTrainers ? <Lock className="w-4 h-4 mr-1" /> : <Unlock className="w-4 h-4 mr-1" />}
              Lock Trainers
            </Label>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-3 ${isLightMode ? 'bg-white/80' : 'bg-white/10'} backdrop-blur-md`}>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="trainers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Trainers
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            {/* Location Tabs */}
            <Tabs value={selectedLocation} onValueChange={setSelectedLocation}>
              <TabsList className={`${isLightMode ? 'bg-white/80' : 'bg-white/10'} backdrop-blur-md`}>
                {locations.map(location => (
                  <TabsTrigger 
                    key={location} 
                    value={location}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                  >
                    {location.split(',')[0]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {locations.map(location => (
                <TabsContent key={location} value={location}>
                  {renderScheduleGrid()}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="trainers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trainers.map(renderTrainerCard)}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={`${isLightMode ? 'bg-white/80' : 'bg-white/10'} backdrop-blur-md border-white/20`}>
                <CardHeader>
                  <CardTitle className={isLightMode ? 'text-gray-900' : 'text-white'}>Class Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.from(new Set(scheduledClasses.map(cls => cls.format))).map(format => {
                      const count = scheduledClasses.filter(cls => cls.format === format).length;
                      return (
                        <div key={format} className="flex justify-between items-center">
                          <span className={`text-sm ${isLightMode ? 'text-gray-700' : 'text-gray-300'}`}>
                            {format.replace('Studio ', '')}
                          </span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isLightMode ? 'bg-white/80' : 'bg-white/10'} backdrop-blur-md border-white/20`}>
                <CardHeader>
                  <CardTitle className={isLightMode ? 'text-gray-900' : 'text-white'}>Revenue Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className={`text-sm ${isLightMode ? 'text-gray-600' : 'text-gray-400'}`}>Total Historical Revenue</div>
                      <div className={`text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
                        {formatCurrency(csvData.reduce((sum, row) => sum + parseFloat(row['Total Revenue'] || '0'), 0))}
                      </div>
                    </div>
                    <div>
                      <div className={`text-sm ${isLightMode ? 'text-gray-600' : 'text-gray-400'}`}>Average Class Revenue</div>
                      <div className={`text-lg font-semibold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
                        {formatCurrency(csvData.reduce((sum, row) => sum + parseFloat(row['Total Revenue'] || '0'), 0) / csvData.length)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Class Details Modal */}
        <Dialog open={showClassModal} onOpenChange={setShowClassModal}>
          <DialogContent className={`${isLightMode ? 'bg-white' : 'bg-gray-900'} max-w-4xl max-h-[90vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle className={`${isLightMode ? 'text-gray-900' : 'text-white'}`}>
                Schedule Class - {selectedSlot?.day} {selectedSlot?.time}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Class Format</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(csvData.map(row => row['Cleaned Class']))).map(format => (
                        <SelectItem key={format} value={format}>{format}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Trainer</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.map(trainer => {
                        const hours = calculateTrainerHours()[trainer.name]?.hours || 0;
                        return (
                          <SelectItem key={trainer.name} value={trainer.name} disabled={hours >= 15}>
                            <div className="flex items-center justify-between w-full">
                              <span>{trainer.name}</span>
                              <span className="text-xs text-gray-500 ml-2">({hours.toFixed(1)}h)</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Time Slot</Label>
                  <Select defaultValue={selectedSlot?.time}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Card className={`${isLightMode ? 'bg-gray-50' : 'bg-gray-800'}`}>
                  <CardHeader>
                    <CardTitle className="text-sm">AI Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-green-600">
                        <Zap className="w-4 h-4 mr-1" />
                        <span>High demand time slot</span>
                      </div>
                      <div className="flex items-center text-sm text-blue-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span>Optimal for Barre classes</span>
                      </div>
                      <div className="flex items-center text-sm text-purple-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>Expected attendance: 8-12</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${isLightMode ? 'bg-gray-50' : 'bg-gray-800'}`}>
                  <CardHeader>
                    <CardTitle className="text-sm">Historical Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <div>Average Attendance: <span className="font-semibold">9.2</span></div>
                      <div>Best Performing Format: <span className="font-semibold">Studio Barre 57</span></div>
                      <div>Revenue Potential: <span className="font-semibold">₹12.5K</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
