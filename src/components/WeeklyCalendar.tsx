import React, { useState } from 'react';
import { Clock, Users, TrendingUp, Star, Lock, Zap, Award, Calendar, Target, ChevronDown, ChevronUp, Filter, Eye, Edit } from 'lucide-react';
import { ClassData, ScheduledClass } from '../types';
import { getClassAverageForSlot, getTimeSlotsWithData, getClassesAtTimeSlot } from '../utils/classUtils';
import DayViewModal from './DayViewModal';

interface WeeklyCalendarProps {
  location: string;
  csvData: ClassData[];
  scheduledClasses: ScheduledClass[];
  onSlotClick: (day: string, time: string, location: string) => void;
  onClassEdit: (classData: ScheduledClass) => void;
  lockedClasses?: Set<string>;
  isDarkMode: boolean;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  location,
  csvData,
  scheduledClasses,
  onSlotClick,
  onClassEdit,
  lockedClasses = new Set(),
  isDarkMode
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [minParticipants, setMinParticipants] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showDayView, setShowDayView] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
  ];

  const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
  const timeSlotsWithData = getTimeSlotsWithData(csvData, location);

  const handleDayClick = (day: string) => {
    setSelectedDay(day);
    setShowDayView(true);
  };

  const handleClassClick = (e: React.MouseEvent, scheduledClass: ScheduledClass) => {
    e.stopPropagation();
    onClassEdit(scheduledClass);
  };

  const getHistoricData = (day: string, time: string) => {
    // Only show historic data for time slots that actually have data
    if (!timeSlotsWithData.has(time)) return null;

    const historicClasses = csvData.filter(
      item => item.location === location && 
      item.dayOfWeek === day && 
      item.classTime.includes(time.slice(0, 5)) &&
      !item.cleanedClass.toLowerCase().includes('hosted')
    );
    
    if (historicClasses.length === 0) return null;
    
    const avgParticipants = historicClasses.reduce((sum, cls) => sum + cls.participants, 0) / historicClasses.length;
    const avgRevenue = historicClasses.reduce((sum, cls) => sum + cls.totalRevenue, 0) / historicClasses.length;
    const peakParticipants = Math.max(...historicClasses.map(cls => cls.participants));
    const checkedIn = historicClasses.reduce((sum, cls) => sum + cls.checkedIn, 0);
    const emptyClasses = historicClasses.filter(cls => cls.participants === 0).length;
    const lateCancellations = historicClasses.reduce((sum, cls) => sum + cls.lateCancellations, 0);
    const comps = historicClasses.reduce((sum, cls) => sum + cls.comps, 0);
    const totalRevenue = historicClasses.reduce((sum, cls) => sum + cls.totalRevenue, 0);
    
    // Get top 3 teachers for this slot
    const teacherStats = historicClasses.reduce((acc, cls) => {
      if (!acc[cls.teacherName]) {
        acc[cls.teacherName] = { participants: 0, count: 0 };
      }
      acc[cls.teacherName].participants += cls.participants;
      acc[cls.teacherName].count += 1;
      return acc;
    }, {} as any);

    const topTeachers = Object.entries(teacherStats)
      .map(([teacher, stats]: [string, any]) => ({
        teacher,
        avgParticipants: parseFloat((stats.participants / stats.count).toFixed(1))
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants)
      .slice(0, 3);

    // Get next best class formats
    const formatStats = historicClasses.reduce((acc, cls) => {
      if (!acc[cls.cleanedClass]) {
        acc[cls.cleanedClass] = { participants: 0, count: 0 };
      }
      acc[cls.cleanedClass].participants += cls.participants;
      acc[cls.cleanedClass].count += 1;
      return acc;
    }, {} as any);

    const topFormats = Object.entries(formatStats)
      .map(([format, stats]: [string, any]) => ({
        format,
        avgParticipants: parseFloat((stats.participants / stats.count).toFixed(1))
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants)
      .slice(0, 3);
    
    return {
      count: historicClasses.length,
      avgParticipants: parseFloat(avgParticipants.toFixed(1)),
      avgRevenue: parseFloat(avgRevenue.toFixed(1)),
      peakParticipants,
      checkedIn,
      emptyClasses,
      lateCancellations,
      compsPercentage: parseFloat((historicClasses.length > 0 ? (comps / historicClasses.length * 100) : 0).toFixed(1)),
      totalRevenue: parseFloat(totalRevenue.toFixed(1)),
      topTeachers,
      topFormats,
      popularClass: historicClasses.sort((a, b) => b.participants - a.participants)[0]?.cleanedClass || 'N/A',
      bestTeacher: historicClasses.sort((a, b) => b.participants - a.participants)[0]?.teacherName || 'N/A'
    };
  };

  const getScheduledClasses = (day: string, time: string) => {
    return getClassesAtTimeSlot(scheduledClasses, day, time, location);
  };

  const getTeacherAvatar = (teacherName: string) => {
    const initials = teacherName.split(' ').map(n => n[0]).join('').toUpperCase();
    const isPriority = priorityTeachers.some(name => teacherName.includes(name));
    
    return (
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
        isPriority ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
        'bg-gradient-to-r from-purple-500 to-pink-500'
      }`}>
        {initials}
      </div>
    );
  };

  const isRestrictedTime = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    const minute = parseInt(time.split(':')[1]);
    const timeInMinutes = hour * 60 + minute;
    
    // 12:00 PM to 3:30 PM = 720 to 930 minutes
    return timeInMinutes >= 720 && timeInMinutes <= 930;
  };

  const renderCell = (day: string, time: string) => {
    const historicData = getHistoricData(day, time);
    const scheduledClassesInSlot = getScheduledClasses(day, time);
    const isRestricted = isRestrictedTime(time);
    
    // Apply filters
    if (historicData && historicData.avgParticipants < minParticipants) {
      return (
        <div
          key={`${day}-${time}`}
          className={`relative h-32 border cursor-pointer transition-all duration-300 ${
            isDarkMode ? 'border-gray-600 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
          }`}
        />
      );
    }
    
    return (
      <div
        key={`${day}-${time}`}
        onClick={() => {
          if (isRestricted && scheduledClassesInSlot.every(cls => !cls.isPrivate)) {
            alert('Classes cannot be scheduled between 12:00 PM - 3:30 PM except private classes');
            return;
          }
          if (scheduledClassesInSlot.length === 0) {
            onSlotClick(day, time, location);
          }
        }}
        className={`relative h-32 border cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group ${
          isRestricted && scheduledClassesInSlot.every(cls => !cls.isPrivate)
            ? isDarkMode 
              ? 'bg-red-900/20 border-red-500/30 cursor-not-allowed'
              : 'bg-red-50 border-red-200 cursor-not-allowed'
            : scheduledClassesInSlot.length > 0
              ? 'bg-gradient-to-br from-green-400/20 to-emerald-500/20 hover:from-green-400/30 hover:to-emerald-500/30 border-green-400/50'
              : historicData 
                ? isDarkMode
                  ? 'bg-gradient-to-br from-blue-400/10 to-cyan-500/10 hover:from-blue-400/20 hover:to-cyan-500/20 border-blue-400/30 border-gray-600' 
                  : 'bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-blue-200'
                : isDarkMode
                  ? 'bg-gray-800/30 hover:bg-gray-700/50 border-gray-600'
                  : 'bg-white hover:bg-gray-50 border-gray-300'
        }`}
      >
        {isRestricted && scheduledClassesInSlot.every(cls => !cls.isPrivate) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-xs font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              Restricted
            </div>
          </div>
        )}

        {scheduledClassesInSlot.length > 0 && (
          <div className="absolute inset-0 p-2 space-y-1 overflow-hidden">
            {scheduledClassesInSlot.map((cls, index) => {
              const isLocked = lockedClasses.has(cls.id);
              return (
                <div
                  key={cls.id}
                  onClick={(e) => handleClassClick(e, cls)}
                  className={`p-2 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all duration-200 ${
                    cls.isTopPerformer 
                      ? 'bg-yellow-400/20 border-yellow-400 hover:bg-yellow-400/30' 
                      : cls.isPrivate 
                      ? 'bg-purple-400/20 border-purple-400 hover:bg-purple-400/30'
                      : 'bg-green-400/20 border-green-400 hover:bg-green-400/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={`text-xs font-semibold truncate flex-1 ${
                      cls.isTopPerformer ? 'text-yellow-200' : 
                      cls.isPrivate ? 'text-purple-200' :
                      'text-green-200'
                    }`}>
                      {cls.classFormat}
                    </div>
                    <div className="flex items-center space-x-1 ml-1">
                      {cls.isTopPerformer && <Star className="h-3 w-3 text-yellow-400" />}
                      {isLocked && <Lock className="h-3 w-3 text-red-400" />}
                      {cls.isPrivate && <Users className="h-3 w-3 text-purple-400" />}
                      <Edit className="h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getTeacherAvatar(`${cls.teacherFirstName} ${cls.teacherLastName}`)}
                      <div className={`ml-2 text-xs truncate ${
                        cls.isTopPerformer ? 'text-yellow-300' : 
                        cls.isPrivate ? 'text-purple-300' :
                        'text-green-300'
                      }`}>
                        {cls.teacherFirstName}
                      </div>
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {parseFloat(cls.duration) * 60}min
                    </div>
                  </div>
                  
                  {cls.participants && (
                    <div className={`text-xs flex items-center mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Users className="h-3 w-3 mr-1" />
                      {cls.participants}
                    </div>
                  )}
                </div>
              );
            })}
            
            {scheduledClassesInSlot.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    Click to add class
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {historicData && scheduledClassesInSlot.length === 0 && !isRestricted && (
          <div className="absolute inset-0 p-2 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                {historicData.count} classes
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {historicData.avgParticipants} avg
              </div>
              <div className="flex justify-center mt-1">
                <div className={`w-2 h-2 rounded-full opacity-60 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Enhanced Hover Tooltip */}
        {(historicData || scheduledClassesInSlot.length > 0) && (
          <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-96 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} ${isDarkMode ? 'text-white' : 'text-gray-900'} text-xs rounded-xl p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-2xl`}>
            {scheduledClassesInSlot.length > 0 ? (
              <div>
                <div className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Zap className="h-4 w-4 mr-2 text-blue-400" />
                  Scheduled Classes ({scheduledClassesInSlot.length})
                </div>
                
                <div className="space-y-3">
                  {scheduledClassesInSlot.map((cls, index) => (
                    <div key={cls.id} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Class:</div>
                          <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cls.classFormat}</div>
                        </div>
                        <div>
                          <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Duration:</div>
                          <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{parseFloat(cls.duration) * 60} mins</div>
                        </div>
                        <div>
                          <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Teacher:</div>
                          <div className={`font-medium flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {getTeacherAvatar(`${cls.teacherFirstName} ${cls.teacherLastName}`)}
                            <span className="ml-2">{cls.teacherFirstName} {cls.teacherLastName}</span>
                          </div>
                        </div>
                        {cls.participants && (
                          <div>
                            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Expected:</div>
                            <div className="text-green-400 font-medium">{cls.participants} participants</div>
                          </div>
                        )}
                      </div>

                      {cls.isTopPerformer && (
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <div className="text-yellow-300 text-xs font-medium flex items-center">
                            <Award className="h-3 w-3 mr-1" />
                            Top performing class
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : historicData ? (
              <div>
                <div className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-400" />
                  Historic Performance Analysis
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Classes Held:</div>
                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{historicData.count}</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Avg Participants:</div>
                    <div className="text-green-400 font-medium">{historicData.avgParticipants}</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Check-ins:</div>
                    <div className="text-blue-400 font-medium">{historicData.checkedIn}</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Empty Classes:</div>
                    <div className="text-red-400 font-medium">{historicData.emptyClasses}</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Late Cancellations:</div>
                    <div className="text-orange-400 font-medium">{historicData.lateCancellations}</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Comped %:</div>
                    <div className="text-purple-400 font-medium">{historicData.compsPercentage}%</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Total Revenue:</div>
                    <div className="text-green-400 font-medium">₹{Math.round(historicData.totalRevenue / 1000)}K</div>
                  </div>
                  <div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Peak Attendance:</div>
                    <div className="text-blue-400 font-medium">{historicData.peakParticipants}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <div className="text-blue-300 text-xs font-medium mb-1">Top 3 Teachers:</div>
                    {historicData.topTeachers.map((teacher, index) => (
                      <div key={index} className="text-blue-200 text-xs">
                        {index + 1}. {teacher.teacher} ({teacher.avgParticipants} avg)
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <div className="text-green-300 text-xs font-medium mb-1">Best Class Formats:</div>
                    {historicData.topFormats.map((format, index) => (
                      <div key={index} className="text-green-200 text-xs">
                        {index + 1}. {format.format} ({format.avgParticipants} avg)
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <div className="text-green-300 text-xs flex items-center">
                    <Target className="h-3 w-3 mr-1" />
                    Click to schedule a class for this time slot
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  // Calculate summary stats for this location
  const locationClasses = scheduledClasses.filter(cls => cls.location === location);
  const totalClasses = locationClasses.length;
  const topPerformers = locationClasses.filter(cls => cls.isTopPerformer).length;
  const privateClasses = locationClasses.filter(cls => cls.isPrivate).length;
  const totalParticipants = locationClasses.reduce((sum, cls) => sum + (cls.participants || 0), 0);
  const avgParticipants = totalClasses > 0 ? parseFloat((totalParticipants / totalClasses).toFixed(1)) : 0;

  const cardBg = isDarkMode 
    ? 'bg-gradient-to-br from-gray-800/50 to-gray-700/50' 
    : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-600' : 'border-gray-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-600';

  return (
    <>
      <div className={`${cardBg} backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border ${borderColor}`}>
        <div className={`p-6 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-b ${borderColor}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-2xl font-bold ${textPrimary}`}>{location}</h2>
              <p className={textSecondary}>Weekly Schedule Overview</p>
            </div>
            
            {/* Location Summary Stats */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-blue-500/20 p-3 rounded-lg border border-blue-500/30">
                <div className={`text-lg font-bold ${textPrimary}`}>{totalClasses}</div>
                <div className="text-xs text-blue-300">Total Classes</div>
              </div>
              <div className="bg-yellow-500/20 p-3 rounded-lg border border-yellow-500/30">
                <div className={`text-lg font-bold ${textPrimary}`}>{topPerformers}</div>
                <div className="text-xs text-yellow-300">Top Performers</div>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-lg border border-purple-500/30">
                <div className={`text-lg font-bold ${textPrimary}`}>{privateClasses}</div>
                <div className="text-xs text-purple-300">Private Classes</div>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg border border-green-500/30">
                <div className={`text-lg font-bold ${textPrimary}`}>{avgParticipants}</div>
                <div className="text-xs text-green-300">Avg Participants</div>
              </div>
            </div>
          </div>

          {/* Collapsible Filters */}
          <div className="mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 ${isDarkMode ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors`}
            >
              <Filter className="h-4 w-4 mr-2 text-blue-400" />
              <span className={textPrimary}>Advanced Filters</span>
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </button>
            
            {showFilters && (
              <div className={`mt-4 p-4 ${isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50'} rounded-lg border ${borderColor}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                      Date Range
                    </label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className={`w-full px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="all">All Time</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="last90">Last 90 Days</option>
                      <option value="last180">Last 6 Months</option>
                      <option value="lastyear">Last Year</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                      Min Participants
                    </label>
                    <input
                      type="number"
                      value={minParticipants}
                      onChange={(e) => setMinParticipants(parseInt(e.target.value) || 0)}
                      className={`w-full px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setDateRange('all');
                        setMinParticipants(0);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded mr-2"></div>
              <span className={textSecondary}>Top Performer</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded mr-2"></div>
              <span className={textSecondary}>Private Class</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded mr-2"></div>
              <span className={textSecondary}>Regular Class</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded mr-2 ${isDarkMode ? 'bg-gradient-to-r from-blue-400 to-cyan-500' : 'bg-blue-200'}`}></div>
              <span className={textSecondary}>Historic Data</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded mr-2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
              <span className={textSecondary}>Available</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded mr-2 ${isDarkMode ? 'bg-red-600' : 'bg-red-200'}`}></div>
              <span className={textSecondary}>Restricted (12-3:30 PM)</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header */}
            <div className="grid grid-cols-8 bg-gray-800/50">
              <div className={`p-4 text-sm font-semibold ${textSecondary} border-b ${borderColor} ${isDarkMode ? 'bg-gray-800/70' : 'bg-gray-100'}`}>
                <Clock className="h-4 w-4 inline mr-2" />
                Time
              </div>
              {days.map(day => (
                <div 
                  key={day} 
                  onClick={() => handleDayClick(day)}
                  className={`p-4 text-sm font-semibold ${textSecondary} border-b ${borderColor} text-center ${isDarkMode ? 'bg-gray-800/70 hover:bg-gray-700/70' : 'bg-gray-100 hover:bg-gray-200'} cursor-pointer transition-colors group`}
                >
                  <div className="flex items-center justify-center">
                    <span>{day}</span>
                    <Eye className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                    {scheduledClasses.filter(cls => cls.location === location && cls.day === day).length} classes
                  </div>
                </div>
              ))}
            </div>
            
            {/* Time slots */}
            {timeSlots.map(time => (
              <div key={time} className={`grid grid-cols-8 hover:${isDarkMode ? 'bg-gray-700/20' : 'bg-gray-50'} transition-colors`}>
                <div className={`p-3 text-sm font-medium ${textSecondary} border-b ${borderColor} ${isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50'} flex items-center`}>
                  <div>
                    <div className="font-semibold">{time}</div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {scheduledClasses.filter(cls => cls.location === location && cls.time === time).length} scheduled
                    </div>
                  </div>
                </div>
                {days.map(day => renderCell(day, time))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day View Modal */}
      <DayViewModal
        isOpen={showDayView}
        onClose={() => setShowDayView(false)}
        day={selectedDay || ''}
        location={location}
        csvData={csvData}
        scheduledClasses={scheduledClasses}
        onSlotClick={onSlotClick}
        isDarkMode={isDarkMode}
      />
    </>
  );
};

export default WeeklyCalendar;