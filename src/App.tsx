import React, { useState, useEffect } from 'react';
import { Upload, Calendar, Brain, Users, Clock, AlertTriangle, Settings, Star, Lock, Unlock, Plus, Download, Eye, Printer, RotateCcw, RotateCw, Trash2, Filter, BarChart3, TrendingUp, MapPin, UserPlus, Sun, Moon } from 'lucide-react';
import CSVUpload from './components/CSVUpload';
import WeeklyCalendar from './components/WeeklyCalendar';
import ClassModal from './components/ClassModal';
import TeacherHourTracker from './components/TeacherHourTracker';
import SmartOptimizer from './components/SmartOptimizer';
import AISettings from './components/AISettings';
import ExportModal from './components/ExportModal';
import StudioSettings from './components/StudioSettings';
import MonthlyView from './components/MonthlyView';
import YearlyView from './components/YearlyView';
import AnalyticsView from './components/AnalyticsView';
import { ClassData, ScheduledClass, TeacherHours, CustomTeacher, TeacherAvailability } from './types';
import { getTopPerformingClasses, getClassDuration, calculateTeacherHours, getClassCounts, validateTeacherHours, getTeacherSpecialties, getClassAverageForSlot, getBestTeacherForClass, generateUniqueSchedule } from './utils/classUtils';
import { aiService } from './utils/aiService';
import { saveCSVData, loadCSVData, saveScheduledClasses, loadScheduledClasses, saveCustomTeachers, loadCustomTeachers, saveTeacherAvailability, loadTeacherAvailability } from './utils/dataStorage';

function App() {
  const [csvData, setCsvData] = useState<ClassData[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [activeView, setActiveView] = useState<string>('calendar');
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [scheduleHistory, setScheduleHistory] = useState<ScheduledClass[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string; location: string } | null>(null);
  const [editingClass, setEditingClass] = useState<ScheduledClass | null>(null);
  const [teacherHours, setTeacherHours] = useState<TeacherHours>({});
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStudioSettings, setShowStudioSettings] = useState(false);
  const [showTeacherCards, setShowTeacherCards] = useState(false);
  const [isPopulatingTopClasses, setIsPopulatingTopClasses] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lockedClasses, setLockedClasses] = useState<Set<string>>(new Set());
  const [lockedTeachers, setLockedTeachers] = useState<Set<string>>(new Set());
  const [classesLocked, setClassesLocked] = useState(false);
  const [teachersLocked, setTeachersLocked] = useState(false);
  const [customTeachers, setCustomTeachers] = useState<CustomTeacher[]>([]);
  const [teacherAvailability, setTeacherAvailability] = useState<TeacherAvailability>({});
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [optimizationIteration, setOptimizationIteration] = useState(0);
  const [filterOptions, setFilterOptions] = useState({
    showTopPerformers: true,
    showPrivateClasses: true,
    showRegularClasses: true,
    selectedTeacher: '',
    selectedClassFormat: ''
  });

  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];

  const views = [
    { id: 'calendar', name: 'Weekly Calendar', icon: Calendar },
    { id: 'monthly', name: 'Monthly View', icon: BarChart3 },
    { id: 'yearly', name: 'Yearly View', icon: TrendingUp },
    { id: 'analytics', name: 'Analytics', icon: Eye }
  ];

  // Load data on app initialization
  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider');
    const savedKey = localStorage.getItem('ai_key');
    const savedEndpoint = localStorage.getItem('ai_endpoint');
    const savedTheme = localStorage.getItem('theme');

    // Load AI settings
    if (savedProvider && savedKey && savedEndpoint) {
      aiService.setProvider({
        name: savedProvider,
        key: savedKey,
        endpoint: savedEndpoint
      });
    }

    // Load theme
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }

    // Load persistent data
    const savedCsvData = loadCSVData();
    const savedScheduledClasses = loadScheduledClasses();
    const savedCustomTeachers = loadCustomTeachers();
    const savedTeacherAvailability = loadTeacherAvailability();

    if (savedCsvData.length > 0) {
      setCsvData(savedCsvData);
      const firstLocation = locations.find(loc => 
        savedCsvData.some((item: ClassData) => item.location === loc)
      ) || locations[0];
      setActiveTab(firstLocation);
    }

    if (savedScheduledClasses.length > 0) {
      setScheduledClasses(savedScheduledClasses);
      setTeacherHours(calculateTeacherHours(savedScheduledClasses));
    }

    if (savedCustomTeachers.length > 0) {
      setCustomTeachers(savedCustomTeachers);
    }

    if (Object.keys(savedTeacherAvailability).length > 0) {
      setTeacherAvailability(savedTeacherAvailability);
    }
  }, []);

  // Auto-save data when it changes
  useEffect(() => {
    if (csvData.length > 0) {
      saveCSVData(csvData);
    }
  }, [csvData]);

  useEffect(() => {
    saveScheduledClasses(scheduledClasses);
  }, [scheduledClasses]);

  useEffect(() => {
    saveCustomTeachers(customTeachers);
  }, [customTeachers]);

  useEffect(() => {
    saveTeacherAvailability(teacherAvailability);
  }, [teacherAvailability]);

  // Save to history when schedule changes
  useEffect(() => {
    if (scheduledClasses.length > 0) {
      const newHistory = scheduleHistory.slice(0, historyIndex + 1);
      newHistory.push([...scheduledClasses]);
      setScheduleHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [scheduledClasses]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const handleDataUpload = (data: ClassData[]) => {
    console.log('Data uploaded to App:', data.length, 'records');
    setCsvData(data);
    if (data.length > 0) {
      const firstLocation = locations.find(loc => 
        data.some(item => item.location === loc)
      ) || locations[0];
      setActiveTab(firstLocation);
    }
  };

  const handleSlotClick = (day: string, time: string, location: string) => {
    setSelectedSlot({ day, time, location });
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleClassEdit = (classData: ScheduledClass) => {
    setEditingClass(classData);
    setSelectedSlot({ day: classData.day, time: classData.time, location: classData.location });
    setIsModalOpen(true);
  };

  const handleClassSchedule = (classData: ScheduledClass) => {
    if (editingClass) {
      // Update existing class
      setScheduledClasses(prev => 
        prev.map(cls => cls.id === editingClass.id ? classData : cls)
      );
    } else {
      // Validate teacher hours before scheduling
      const validation = validateTeacherHours(scheduledClasses, classData);
      
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }

      if (validation.warning) {
        const proceed = confirm(`${validation.warning}\n\nDo you want to proceed?`);
        if (!proceed) return;
      }

      setScheduledClasses(prev => [...prev, classData]);
    }
    
    // Update teacher hours
    setTeacherHours(calculateTeacherHours(scheduledClasses));
    setIsModalOpen(false);
    setEditingClass(null);
  };

  const handleOptimizedSchedule = (optimizedClasses: ScheduledClass[]) => {
    // Validate all teacher hours in optimized schedule
    const teacherHoursCheck: Record<string, number> = {};
    const invalidTeachers: string[] = [];

    optimizedClasses.forEach(cls => {
      const teacherKey = `${cls.teacherFirstName} ${cls.teacherLastName}`;
      teacherHoursCheck[teacherKey] = parseFloat(((teacherHoursCheck[teacherKey] || 0) + parseFloat(cls.duration || '1')).toFixed(1));
    });

    Object.entries(teacherHoursCheck).forEach(([teacher, hours]) => {
      if (hours > 15) {
        invalidTeachers.push(`${teacher}: ${hours.toFixed(1)}h`);
      }
    });

    if (invalidTeachers.length > 0) {
      alert(`The following teachers would exceed 15 hours:\n${invalidTeachers.join('\n')}\n\nPlease adjust the schedule.`);
      return;
    }

    setScheduledClasses(optimizedClasses);
    setTeacherHours(teacherHoursCheck);
    setShowOptimizer(false);
  };

  const handlePopulateTopClasses = async () => {
    if (csvData.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsPopulatingTopClasses(true);

    try {
      // Get top performing classes with average > 6
      const topClasses = getTopPerformingClasses(csvData, 6);
      
      const newScheduledClasses: ScheduledClass[] = [];
      const teacherHoursCheck: Record<string, number> = {};

      // Calculate current teacher hours
      scheduledClasses.forEach(cls => {
        const teacherKey = `${cls.teacherFirstName} ${cls.teacherLastName}`;
        teacherHoursCheck[teacherKey] = parseFloat(((teacherHoursCheck[teacherKey] || 0) + parseFloat(cls.duration || '1')).toFixed(1));
      });

      // First populate classes with specific teacher assignments
      topClasses.forEach(cls => {
        const teacherKey = cls.teacher;
        const duration = parseFloat(getClassDuration(cls.classFormat));
        
        // Check if adding this class would exceed 15 hours
        if ((teacherHoursCheck[teacherKey] || 0) + duration <= 15) {
          // Check for conflicts
          const hasConflict = [...scheduledClasses, ...newScheduledClasses].some(existing => 
            existing.location === cls.location &&
            existing.day === cls.day &&
            existing.time === cls.time
          );

          if (!hasConflict) {
            const newClass: ScheduledClass = {
              id: `top-${cls.location}-${cls.day}-${cls.time}-${Date.now()}-${Math.random()}`,
              day: cls.day,
              time: cls.time,
              location: cls.location,
              classFormat: cls.classFormat,
              teacherFirstName: cls.teacher.split(' ')[0] || '',
              teacherLastName: cls.teacher.split(' ').slice(1).join(' ') || '',
              duration: getClassDuration(cls.classFormat),
              participants: cls.avgParticipants,
              revenue: cls.avgRevenue,
              isTopPerformer: true
            };

            newScheduledClasses.push(newClass);
            teacherHoursCheck[teacherKey] = parseFloat(((teacherHoursCheck[teacherKey] || 0) + duration).toFixed(1));
          }
        }
      });

      // Then populate classes without teacher assignments if they have better averages
      const classesWithoutTeacher = getTopPerformingClasses(csvData, 6, false);
      classesWithoutTeacher.forEach(cls => {
        if (cls.avgParticipants > 6) {
          const hasConflict = [...scheduledClasses, ...newScheduledClasses].some(existing => 
            existing.location === cls.location &&
            existing.day === cls.day &&
            existing.time === cls.time
          );

          if (!hasConflict) {
            const bestTeacher = getBestTeacherForClass(csvData, cls.classFormat, cls.location, cls.day, cls.time);
            const teacherKey = bestTeacher || 'TBD';
            const duration = parseFloat(getClassDuration(cls.classFormat));

            if (!bestTeacher || (teacherHoursCheck[teacherKey] || 0) + duration <= 15) {
              const newClass: ScheduledClass = {
                id: `top-no-teacher-${cls.location}-${cls.day}-${cls.time}-${Date.now()}-${Math.random()}`,
                day: cls.day,
                time: cls.time,
                location: cls.location,
                classFormat: cls.classFormat,
                teacherFirstName: bestTeacher ? bestTeacher.split(' ')[0] : '',
                teacherLastName: bestTeacher ? bestTeacher.split(' ').slice(1).join(' ') : '',
                duration: getClassDuration(cls.classFormat),
                participants: cls.avgParticipants,
                revenue: cls.avgRevenue,
                isTopPerformer: true
              };

              newScheduledClasses.push(newClass);
              if (bestTeacher) {
                teacherHoursCheck[teacherKey] = parseFloat(((teacherHoursCheck[teacherKey] || 0) + duration).toFixed(1));
              }
            }
          }
        }
      });

      setScheduledClasses(prev => [...prev, ...newScheduledClasses]);
      setTeacherHours(calculateTeacherHours([...scheduledClasses, ...newScheduledClasses]));

      alert(`Successfully populated ${newScheduledClasses.length} top-performing classes (avg > 6 participants)!`);
    } catch (error) {
      console.error('Error populating top classes:', error);
      alert('Error populating top classes. Please try again.');
    } finally {
      setIsPopulatingTopClasses(false);
    }
  };

  const handleAutoOptimize = async () => {
    if (csvData.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsOptimizing(true);

    try {
      // Generate unique schedule each time
      const optimizedSchedule = generateUniqueSchedule(csvData, customTeachers, optimizationIteration);
      setOptimizationIteration(prev => prev + 1);
      
      setScheduledClasses(optimizedSchedule);
      setTeacherHours(calculateTeacherHours(optimizedSchedule));

      alert(`Generated unique optimized schedule (iteration ${optimizationIteration + 1}) with advanced algorithms!`);
    } catch (error) {
      console.error('Error optimizing schedule:', error);
      alert('Error optimizing schedule. Please check your AI configuration in settings.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setScheduledClasses(scheduleHistory[historyIndex - 1]);
      setTeacherHours(calculateTeacherHours(scheduleHistory[historyIndex - 1]));
    }
  };

  const handleRedo = () => {
    if (historyIndex < scheduleHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setScheduledClasses(scheduleHistory[historyIndex + 1]);
      setTeacherHours(calculateTeacherHours(scheduleHistory[historyIndex + 1]));
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all scheduled classes?')) {
      setScheduledClasses([]);
      setTeacherHours({});
      setLockedClasses(new Set());
      setLockedTeachers(new Set());
      setClassesLocked(false);
      setTeachersLocked(false);
    }
  };

  const toggleClassLock = () => {
    setClassesLocked(!classesLocked);
    if (!classesLocked) {
      const classIds = new Set(scheduledClasses.map(cls => cls.id));
      setLockedClasses(classIds);
    } else {
      setLockedClasses(new Set());
    }
  };

  const toggleTeacherLock = () => {
    setTeachersLocked(!teachersLocked);
    if (!teachersLocked) {
      const teacherNames = new Set(scheduledClasses.map(cls => `${cls.teacherFirstName} ${cls.teacherLastName}`));
      setLockedTeachers(teacherNames);
    } else {
      setLockedTeachers(new Set());
    }
  };

  const classCounts = getClassCounts(scheduledClasses);

  // Show upload screen if no data
  if (csvData.length === 0) {
    return <CSVUpload onDataUpload={handleDataUpload} isDarkMode={isDarkMode} />;
  }

  const renderMainContent = () => {
    switch (activeView) {
      case 'monthly':
        return <MonthlyView scheduledClasses={scheduledClasses} csvData={csvData} isDarkMode={isDarkMode} />;
      case 'yearly':
        return <YearlyView scheduledClasses={scheduledClasses} csvData={csvData} isDarkMode={isDarkMode} />;
      case 'analytics':
        return <AnalyticsView scheduledClasses={scheduledClasses} csvData={csvData} isDarkMode={isDarkMode} />;
      default:
        return (
          <>
            {/* Location Tabs */}
            <div className={`flex space-x-1 mb-6 ${isDarkMode ? 'bg-gray-800/30' : 'bg-white/80'} backdrop-blur-xl rounded-2xl p-1 shadow-lg border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
              {locations.map((location) => (
                <button
                  key={location}
                  onClick={() => setActiveTab(location)}
                  className={`flex-1 py-4 px-6 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === location
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform scale-105'
                      : isDarkMode 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {location.split(',')[0]}
                  </div>
                </button>
              ))}
            </div>

            {/* Teacher Hours Tracker - Collapsible */}
            <div className="mb-6">
              <TeacherHourTracker 
                teacherHours={teacherHours} 
                isDarkMode={isDarkMode}
                showCards={showTeacherCards}
                onToggleCards={() => setShowTeacherCards(!showTeacherCards)}
              />
            </div>

            {/* Weekly Calendar */}
            {activeTab && (
              <WeeklyCalendar
                location={activeTab}
                csvData={csvData}
                scheduledClasses={scheduledClasses.filter(cls => {
                  if (!filterOptions.showTopPerformers && cls.isTopPerformer) return false;
                  if (!filterOptions.showPrivateClasses && cls.isPrivate) return false;
                  if (!filterOptions.showRegularClasses && !cls.isTopPerformer && !cls.isPrivate) return false;
                  if (filterOptions.selectedTeacher && `${cls.teacherFirstName} ${cls.teacherLastName}` !== filterOptions.selectedTeacher) return false;
                  if (filterOptions.selectedClassFormat && cls.classFormat !== filterOptions.selectedClassFormat) return false;
                  return true;
                })}
                onSlotClick={handleSlotClick}
                onClassEdit={handleClassEdit}
                lockedClasses={lockedClasses}
                isDarkMode={isDarkMode}
              />
            )}
          </>
        );
    }
  };

  const themeClasses = isDarkMode 
    ? 'min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
    : 'min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100';

  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={themeClasses}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="relative mr-4">
              <Calendar className="h-12 w-12 text-purple-400" />
              <div className="absolute inset-0 h-12 w-12 bg-purple-400 rounded-full blur-lg opacity-30 animate-pulse"></div>
            </div>
            <div>
              <h1 className={`text-4xl font-bold ${textPrimary} bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent`}>
                Smart Class Scheduler
              </h1>
              <p className={textSecondary}>AI-powered optimization for fitness studios</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-3 rounded-xl transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-800/50 text-yellow-400 hover:bg-gray-700/50' 
                  : 'bg-white/80 text-gray-600 hover:bg-white shadow-lg border border-gray-200'
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* History Controls */}
            <div className={`flex items-center space-x-1 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80 border border-gray-200'} backdrop-blur-sm rounded-xl p-1 shadow-lg`}>
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={`p-2 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Undo"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= scheduleHistory.length - 1}
                className={`p-2 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Redo"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                onClick={handleClearAll}
                className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-red-500/20"
                title="Clear All"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handlePopulateTopClasses}
              disabled={isPopulatingTopClasses}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPopulatingTopClasses ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Star className="h-5 w-5 mr-2" />
              )}
              Populate Top Classes
            </button>
            
            <button
              onClick={handleAutoOptimize}
              disabled={isOptimizing}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOptimizing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Brain className="h-5 w-5 mr-2" />
              )}
              Auto Optimize
            </button>

            <button
              onClick={toggleClassLock}
              className={`flex items-center px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                classesLocked 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : isDarkMode 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300'
              }`}
            >
              {classesLocked ? <Lock className="h-5 w-5 mr-2" /> : <Unlock className="h-5 w-5 mr-2" />}
              {classesLocked ? 'Unlock Classes' : 'Lock Classes'}
            </button>

            <button
              onClick={toggleTeacherLock}
              className={`flex items-center px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                teachersLocked 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : isDarkMode 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300'
              }`}
            >
              {teachersLocked ? <Lock className="h-5 w-5 mr-2" /> : <Unlock className="h-5 w-5 mr-2" />}
              {teachersLocked ? 'Unlock Teachers' : 'Lock Teachers'}
            </button>
            
            <button
              onClick={() => setShowOptimizer(true)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Brain className="h-5 w-5 mr-2" />
              AI Optimizer
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>

            <button
              onClick={() => setShowStudioSettings(true)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Studio Settings
            </button>
            
            <button
              onClick={() => setShowAISettings(true)}
              className={`flex items-center px-4 py-2 rounded-xl transition-colors shadow-lg hover:shadow-xl ${
                isDarkMode 
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Settings className="h-5 w-5 mr-2" />
              AI Settings
            </button>
            
            <button
              onClick={() => setCsvData([])}
              className={`flex items-center px-4 py-2 rounded-xl transition-colors shadow-lg hover:shadow-xl ${
                isDarkMode 
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Upload className="h-5 w-5 mr-2" />
              New CSV
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className={`flex space-x-1 mb-6 ${isDarkMode ? 'bg-gray-800/30' : 'bg-white/80'} backdrop-blur-xl rounded-2xl p-1 shadow-lg border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeView === view.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                  : isDarkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <view.icon className="h-5 w-5 mr-2" />
              {view.name}
            </button>
          ))}
        </div>

        {/* Main Content */}
        {renderMainContent()}

        {/* Class Scheduling Modal */}
        {isModalOpen && selectedSlot && (
          <ClassModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingClass(null);
            }}
            selectedSlot={selectedSlot}
            editingClass={editingClass}
            csvData={csvData}
            teacherHours={teacherHours}
            customTeachers={customTeachers}
            teacherAvailability={teacherAvailability}
            scheduledClasses={scheduledClasses}
            onSchedule={handleClassSchedule}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Smart Optimizer Modal */}
        {showOptimizer && (
          <SmartOptimizer
            isOpen={showOptimizer}
            onClose={() => setShowOptimizer(false)}
            csvData={csvData}
            currentSchedule={scheduledClasses}
            onOptimize={handleOptimizedSchedule}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          scheduledClasses={scheduledClasses}
          location={activeTab}
          isDarkMode={isDarkMode}
        />

        {/* Studio Settings Modal */}
        <StudioSettings
          isOpen={showStudioSettings}
          onClose={() => setShowStudioSettings(false)}
          customTeachers={customTeachers}
          onUpdateTeachers={setCustomTeachers}
          teacherAvailability={teacherAvailability}
          onUpdateAvailability={setTeacherAvailability}
          isDarkMode={isDarkMode}
        />

        {/* AI Settings Modal */}
        <AISettings
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}

export default App;