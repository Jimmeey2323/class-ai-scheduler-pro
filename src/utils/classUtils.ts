import { ClassData, TopPerformingClass, ScheduledClass, TeacherHours } from '../types';

export const getClassDuration = (className: string): string => {
  const lowerName = className.toLowerCase();
  
  if (lowerName.includes('express')) {
    return '0.75'; // 45 minutes
  }
  
  if (lowerName.includes('recovery') || lowerName.includes('sweat in 30')) {
    return '0.5'; // 30 minutes
  }
  
  return '1'; // 60 minutes (default)
};

export const isHostedClass = (className: string): boolean => {
  return className.toLowerCase().includes('hosted');
};

// Location-specific class format rules
export const isClassAllowedAtLocation = (classFormat: string, location: string): boolean => {
  const lowerFormat = classFormat.toLowerCase();
  
  if (location === 'Supreme HQ, Bandra') {
    // Supreme HQ: Focus on Fit, PowerCycle, and Barre
    // PowerCycle and PowerCycle Express ONLY at Supreme HQ
    // NO Amped Up or HIIT
    if (lowerFormat.includes('amped up') || lowerFormat.includes('hiit')) {
      return false;
    }
    return true; // All other classes allowed
  } else {
    // Other locations: NO PowerCycle or PowerCycle Express
    if (lowerFormat.includes('powercycle') || lowerFormat.includes('power cycle')) {
      return false;
    }
    return true; // All other classes allowed
  }
};

// Get preferred class formats for each location
export const getPreferredClassFormats = (location: string, csvData: ClassData[]): string[] => {
  const locationData = csvData.filter(item => 
    item.location === location && 
    !isHostedClass(item.cleanedClass) &&
    isClassAllowedAtLocation(item.cleanedClass, location)
  );

  if (location === 'Supreme HQ, Bandra') {
    // Prioritize Fit, PowerCycle, and Barre classes
    const preferredFormats = locationData
      .filter(item => {
        const lowerFormat = item.cleanedClass.toLowerCase();
        return lowerFormat.includes('fit') || 
               lowerFormat.includes('powercycle') || 
               lowerFormat.includes('power cycle') ||
               lowerFormat.includes('barre');
      })
      .map(item => item.cleanedClass);
    
    // Add other allowed formats
    const otherFormats = locationData
      .filter(item => {
        const lowerFormat = item.cleanedClass.toLowerCase();
        return !lowerFormat.includes('fit') && 
               !lowerFormat.includes('powercycle') && 
               !lowerFormat.includes('power cycle') &&
               !lowerFormat.includes('barre');
      })
      .map(item => item.cleanedClass);
    
    return [...new Set([...preferredFormats, ...otherFormats])];
  } else {
    // Other locations: all allowed formats
    return [...new Set(locationData.map(item => item.cleanedClass))];
  }
};

// Check if adding this class would create back-to-back same formats
export const wouldCreateBackToBackSameFormat = (
  scheduledClasses: ScheduledClass[],
  newClass: { day: string; time: string; location: string; classFormat: string }
): boolean => {
  const timeSlots = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
  ];
  
  const currentTimeIndex = timeSlots.indexOf(newClass.time);
  if (currentTimeIndex === -1) return false;
  
  // Check previous time slot
  if (currentTimeIndex > 0) {
    const prevTime = timeSlots[currentTimeIndex - 1];
    const prevClasses = scheduledClasses.filter(cls => 
      cls.day === newClass.day && 
      cls.time === prevTime && 
      cls.location === newClass.location
    );
    if (prevClasses.some(cls => cls.classFormat === newClass.classFormat)) {
      return true;
    }
  }
  
  // Check next time slot
  if (currentTimeIndex < timeSlots.length - 1) {
    const nextTime = timeSlots[currentTimeIndex + 1];
    const nextClasses = scheduledClasses.filter(cls => 
      cls.day === newClass.day && 
      cls.time === nextTime && 
      cls.location === newClass.location
    );
    if (nextClasses.some(cls => cls.classFormat === newClass.classFormat)) {
      return true;
    }
  }
  
  return false;
};

// Get class variety score for a day at a location
export const getClassVarietyScore = (
  scheduledClasses: ScheduledClass[],
  day: string,
  location: string
): number => {
  const dayClasses = scheduledClasses.filter(cls => 
    cls.day === day && cls.location === location
  );
  
  if (dayClasses.length === 0) return 1;
  
  const uniqueFormats = new Set(dayClasses.map(cls => cls.classFormat));
  return uniqueFormats.size / dayClasses.length; // Higher score = more variety
};

// Check if time is valid for evening classes
export const isValidEveningTime = (time: string, day: string): boolean => {
  const hour = parseInt(time.split(':')[0]);
  const isWeekend = day === 'Saturday' || day === 'Sunday';
  
  if (hour >= 17) { // 5 PM or later
    return true;
  }
  
  if (isWeekend && hour >= 16) { // 4 PM or later on weekends
    return true;
  }
  
  return false;
};

// Check if time is morning shift (before 2 PM)
export const isMorningShift = (time: string): boolean => {
  const hour = parseInt(time.split(':')[0]);
  return hour < 14; // Before 2 PM
};

// Get teacher's classes for a specific shift and day
export const getTeacherShiftClasses = (
  scheduledClasses: ScheduledClass[],
  teacherName: string,
  day: string,
  isMorning: boolean
): ScheduledClass[] => {
  return scheduledClasses.filter(cls => {
    const clsTeacherName = `${cls.teacherFirstName} ${cls.teacherLastName}`;
    const clsIsMorning = isMorningShift(cls.time);
    return clsTeacherName === teacherName && cls.day === day && clsIsMorning === isMorning;
  });
};

// Check if teacher can take another class in this shift
export const canTeacherTakeShiftClass = (
  scheduledClasses: ScheduledClass[],
  teacherName: string,
  day: string,
  time: string
): boolean => {
  const isMorning = isMorningShift(time);
  const shiftClasses = getTeacherShiftClasses(scheduledClasses, teacherName, day, isMorning);
  return shiftClasses.length < 4; // Max 4 classes per shift
};

// Get maximum parallel classes for location
export const getMaxParallelClasses = (location: string): number => {
  return location === 'Supreme HQ, Bandra' ? 3 : 2;
};

// Get classes scheduled at specific time slot
export const getClassesAtTimeSlot = (
  scheduledClasses: ScheduledClass[],
  day: string,
  time: string,
  location: string
): ScheduledClass[] => {
  return scheduledClasses.filter(cls => 
    cls.day === day && cls.time === time && cls.location === location
  );
};

// Check if time slot has capacity for more classes
export const hasTimeSlotCapacity = (
  scheduledClasses: ScheduledClass[],
  day: string,
  time: string,
  location: string
): boolean => {
  const existingClasses = getClassesAtTimeSlot(scheduledClasses, day, time, location);
  const maxClasses = getMaxParallelClasses(location);
  return existingClasses.length < maxClasses;
};

export const getLocationAverage = (csvData: ClassData[], location: string): number => {
  const locationData = csvData.filter(item => item.location === location && !isHostedClass(item.cleanedClass));
  if (locationData.length === 0) return 0;
  
  const totalParticipants = locationData.reduce((sum, item) => sum + item.participants, 0);
  return totalParticipants / locationData.length;
};

export const getTopPerformingClasses = (csvData: ClassData[], minAverage: number = 6, includeTeacher: boolean = true): TopPerformingClass[] => {
  // Filter out hosted classes and apply location rules
  const validClasses = csvData.filter(item => 
    !isHostedClass(item.cleanedClass) && 
    isClassAllowedAtLocation(item.cleanedClass, item.location)
  );
  
  // Group by class format, location, day, time, and optionally teacher
  const classGroups = validClasses.reduce((acc, item) => {
    const key = includeTeacher 
      ? `${item.cleanedClass}-${item.location}-${item.dayOfWeek}-${item.classTime.slice(0, 5)}-${item.teacherName}`
      : `${item.cleanedClass}-${item.location}-${item.dayOfWeek}-${item.classTime.slice(0, 5)}`;
    
    if (!acc[key]) {
      acc[key] = {
        classFormat: item.cleanedClass,
        location: item.location,
        day: item.dayOfWeek,
        time: item.classTime.slice(0, 5),
        teacher: includeTeacher ? item.teacherName : '',
        totalParticipants: 0,
        totalRevenue: 0,
        count: 0
      };
    }
    
    acc[key].totalParticipants += item.participants;
    acc[key].totalRevenue += item.totalRevenue;
    acc[key].count += 1;
    
    return acc;
  }, {} as any);
  
  // Filter classes above minimum average and sort by performance
  const topClasses = Object.values(classGroups)
    .map((group: any) => ({
      classFormat: group.classFormat,
      location: group.location,
      day: group.day,
      time: group.time,
      teacher: group.teacher,
      avgParticipants: parseFloat((group.totalParticipants / group.count).toFixed(1)),
      avgRevenue: parseFloat((group.totalRevenue / group.count).toFixed(1)),
      frequency: group.count
    }))
    .filter(cls => cls.frequency >= 2 && cls.avgParticipants >= minAverage)
    .sort((a, b) => {
      // Sort by average participants first, then by frequency
      const participantDiff = b.avgParticipants - a.avgParticipants;
      if (Math.abs(participantDiff) > 1) return participantDiff;
      return b.frequency - a.frequency;
    });
  
  return topClasses;
};

export const getBestTeacherForClass = (
  csvData: ClassData[], 
  classFormat: string, 
  location: string, 
  day: string, 
  time: string
): string | null => {
  const relevantClasses = csvData.filter(item => 
    item.cleanedClass === classFormat &&
    item.location === location &&
    item.dayOfWeek === day &&
    item.classTime.includes(time) &&
    !isHostedClass(item.cleanedClass)
  );

  if (relevantClasses.length === 0) return null;

  // Group by teacher and calculate averages
  const teacherStats = relevantClasses.reduce((acc, item) => {
    if (!acc[item.teacherName]) {
      acc[item.teacherName] = { participants: 0, count: 0 };
    }
    acc[item.teacherName].participants += item.participants;
    acc[item.teacherName].count += 1;
    return acc;
  }, {} as any);

  // Find teacher with highest average
  const bestTeacher = Object.entries(teacherStats)
    .map(([teacher, stats]: [string, any]) => ({
      teacher,
      avgParticipants: stats.participants / stats.count
    }))
    .sort((a, b) => b.avgParticipants - a.avgParticipants)[0];

  return bestTeacher?.teacher || null;
};

export const getClassAverageForSlot = (
  csvData: ClassData[],
  classFormat: string,
  location: string,
  day: string,
  time: string,
  teacherName?: string
): { average: number; count: number } => {
  let relevantClasses = csvData.filter(item => 
    item.cleanedClass === classFormat &&
    item.location === location &&
    item.dayOfWeek === day &&
    item.classTime.includes(time) &&
    !isHostedClass(item.cleanedClass)
  );

  if (teacherName) {
    relevantClasses = relevantClasses.filter(item => item.teacherName === teacherName);
  }

  if (relevantClasses.length === 0) {
    return { average: 0, count: 0 };
  }

  const totalParticipants = relevantClasses.reduce((sum, item) => sum + item.participants, 0);
  return {
    average: parseFloat((totalParticipants / relevantClasses.length).toFixed(1)),
    count: relevantClasses.length
  };
};

export const getTeacherSpecialties = (csvData: ClassData[]): Record<string, Array<{ classFormat: string; avgParticipants: number; classCount: number }>> => {
  const teacherStats: Record<string, Record<string, { participants: number; count: number }>> = {};

  csvData.forEach(item => {
    if (isHostedClass(item.cleanedClass)) return;

    if (!teacherStats[item.teacherName]) {
      teacherStats[item.teacherName] = {};
    }

    if (!teacherStats[item.teacherName][item.cleanedClass]) {
      teacherStats[item.teacherName][item.cleanedClass] = { participants: 0, count: 0 };
    }

    teacherStats[item.teacherName][item.cleanedClass].participants += item.participants;
    teacherStats[item.teacherName][item.cleanedClass].count += 1;
  });

  // Convert to sorted specialties for each teacher
  const specialties: Record<string, Array<{ classFormat: string; avgParticipants: number; classCount: number }>> = {};

  Object.entries(teacherStats).forEach(([teacher, classes]) => {
    specialties[teacher] = Object.entries(classes)
      .map(([classFormat, stats]) => ({
        classFormat,
        avgParticipants: parseFloat((stats.participants / stats.count).toFixed(1)),
        classCount: stats.count
      }))
      .sort((a, b) => {
        // Sort by class count first (experience), then by average participants
        if (b.classCount !== a.classCount) {
          return b.classCount - a.classCount;
        }
        return b.avgParticipants - a.avgParticipants;
      })
      .slice(0, 5); // Top 5 specialties
  });

  return specialties;
};

export const validateTeacherHours = (
  scheduledClasses: ScheduledClass[],
  newClass: ScheduledClass
): { isValid: boolean; warning?: string; error?: string } => {
  const teacherName = `${newClass.teacherFirstName} ${newClass.teacherLastName}`;
  
  // Calculate current hours for this teacher
  const currentHours = scheduledClasses
    .filter(cls => `${cls.teacherFirstName} ${cls.teacherLastName}` === teacherName)
    .reduce((sum, cls) => sum + parseFloat(cls.duration), 0);
  
  const newTotal = currentHours + parseFloat(newClass.duration);
  
  if (newTotal > 15) {
    return {
      isValid: false,
      error: `This would exceed ${teacherName}'s 15-hour weekly limit (currently ${currentHours.toFixed(1)}h, would be ${newTotal.toFixed(1)}h)`
    };
  } else if (newTotal > 12) {
    return {
      isValid: true,
      warning: `${teacherName} would have ${newTotal.toFixed(1)}h this week (approaching 15h limit)`
    };
  }
  
  return { isValid: true };
};

export const calculateTeacherHours = (scheduledClasses: ScheduledClass[]): TeacherHours => {
  return scheduledClasses.reduce((acc, cls) => {
    const teacherName = `${cls.teacherFirstName} ${cls.teacherLastName}`;
    acc[teacherName] = parseFloat(((acc[teacherName] || 0) + parseFloat(cls.duration)).toFixed(1));
    return acc;
  }, {} as TeacherHours);
};

export const getClassCounts = (scheduledClasses: ScheduledClass[]) => {
  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const counts = locations.reduce((acc, location) => {
    acc[location] = days.reduce((dayAcc, day) => {
      const dayClasses = scheduledClasses.filter(cls => cls.location === location && cls.day === day);
      dayAcc[day] = dayClasses.reduce((classAcc, cls) => {
        classAcc[cls.classFormat] = (classAcc[cls.classFormat] || 0) + 1;
        return classAcc;
      }, {} as any);
      return dayAcc;
    }, {} as any);
    return acc;
  }, {} as any);
  
  return counts;
};

export const getUniqueTeachers = (csvData: ClassData[], customTeachers: any[] = []): string[] => {
  const csvTeachers = csvData.map(item => item.teacherName);
  const customTeacherNames = customTeachers.map(t => `${t.firstName} ${t.lastName}`);
  
  return [...new Set([...csvTeachers, ...customTeacherNames])].sort();
};

export const getClassFormatsForDay = (scheduledClasses: ScheduledClass[], day: string): Record<string, number> => {
  const dayClasses = scheduledClasses.filter(cls => cls.day === day);
  return dayClasses.reduce((acc, cls) => {
    acc[cls.classFormat] = (acc[cls.classFormat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

export const isRestrictedTime = (time: string): boolean => {
  const hour = parseInt(time.split(':')[0]);
  const minute = parseInt(time.split(':')[1]);
  const timeInMinutes = hour * 60 + minute;
  
  // 12:00 PM to 3:30 PM = 720 to 930 minutes
  return timeInMinutes >= 720 && timeInMinutes <= 930;
};

export const getTimeSlotsWithData = (csvData: ClassData[], location: string): Set<string> => {
  const timeSlotsWithData = new Set<string>();
  
  csvData
    .filter(item => item.location === location && !isHostedClass(item.cleanedClass))
    .forEach(item => {
      const timeSlot = item.classTime.slice(0, 5); // Extract HH:MM format
      timeSlotsWithData.add(timeSlot);
    });
  
  return timeSlotsWithData;
};

export const generateUniqueSchedule = (
  csvData: ClassData[],
  customTeachers: any[] = [],
  iteration: number = 0
): ScheduledClass[] => {
  const optimizedClasses: ScheduledClass[] = [];
  const teacherHoursTracker: Record<string, number> = {};
  const allTeachers = [...new Set(csvData.map(item => item.teacherName))];
  const newTeachers = customTeachers.filter(t => t.isNew).map(t => `${t.firstName} ${t.lastName}`);
  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Priority teachers who should get maximum hours
  const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
  
  // Add randomization factor based on iteration
  const randomSeed = iteration * 0.1;
  
  // Get teacher specialties
  const teacherSpecialties = getTeacherSpecialties(csvData);
  
  // Define time slots with evening restrictions
  const morningSlots = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
  const eveningSlots = ['15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];

  // Helper function to check if teacher can take more hours
  const canTeacherTakeClass = (teacherName: string, duration: string): boolean => {
    const currentHours = teacherHoursTracker[teacherName] || 0;
    const classDuration = parseFloat(duration);
    const isNewTeacher = newTeachers.includes(teacherName);
    const maxHours = isNewTeacher ? 12 : 15;
    
    return currentHours + classDuration <= maxHours;
  };

  // Helper function to get optimal teacher for a shift
  const getOptimalTeacherForShift = (
    classData: any,
    availableTeachers: string[]
  ): string | null => {
    // Filter teachers who can take this class and have capacity in this shift
    const eligibleTeachers = availableTeachers.filter(teacher => {
      const duration = getClassDuration(classData.classFormat);
      return canTeacherTakeClass(teacher, duration) &&
             canTeacherTakeShiftClass(optimizedClasses, teacher, classData.day, classData.time);
    });

    if (eligibleTeachers.length === 0) return null;

    // Prefer teachers who already have classes in this shift to minimize trainer count
    const teachersInShift = eligibleTeachers.filter(teacher => {
      const shiftClasses = getTeacherShiftClasses(optimizedClasses, teacher, classData.day, isMorningShift(classData.time));
      return shiftClasses.length > 0;
    });

    if (teachersInShift.length > 0) {
      // Among teachers already in shift, prefer those with fewer total hours
      return teachersInShift.sort((a, b) => {
        const aHours = teacherHoursTracker[a] || 0;
        const bHours = teacherHoursTracker[b] || 0;
        return aHours - bHours;
      })[0];
    }

    // If no teachers in shift, pick the one with least hours
    return eligibleTeachers.sort((a, b) => {
      const aHours = teacherHoursTracker[a] || 0;
      const bHours = teacherHoursTracker[b] || 0;
      return aHours - bHours;
    })[0];
  };

  // Helper function to add class if possible
  const addClassIfPossible = (classData: any): boolean => {
    // Check location-specific rules
    if (!isClassAllowedAtLocation(classData.classFormat, classData.location)) {
      return false;
    }

    // Check time slot capacity
    if (!hasTimeSlotCapacity(optimizedClasses, classData.day, classData.time, classData.location)) {
      return false;
    }

    // Check evening time restrictions
    const hour = parseInt(classData.time.split(':')[0]);
    const isWeekend = classData.day === 'Saturday' || classData.day === 'Sunday';
    if (hour >= 16 && !isValidEveningTime(classData.time, classData.day)) {
      return false;
    }

    // Check for back-to-back same format
    if (wouldCreateBackToBackSameFormat(optimizedClasses, classData)) {
      return false;
    }

    const bestTeacher = getBestTeacherForClass(csvData, classData.classFormat, classData.location, classData.day, classData.time);
    const duration = getClassDuration(classData.classFormat);
    
    // Get optimal teacher considering shift optimization
    const optimalTeacher = getOptimalTeacherForShift(classData, allTeachers);
    
    if (!optimalTeacher) return false;

    // Use optimal teacher or best teacher if optimal can't take it
    const assignedTeacher = optimalTeacher;
    
    optimizedClasses.push({
      id: `optimized-${classData.location}-${classData.day}-${classData.time}-${Date.now()}-${Math.random()}`,
      day: classData.day,
      time: classData.time,
      location: classData.location,
      classFormat: classData.classFormat,
      teacherFirstName: assignedTeacher.split(' ')[0],
      teacherLastName: assignedTeacher.split(' ').slice(1).join(' '),
      duration: duration,
      participants: classData.avgParticipants,
      revenue: classData.avgRevenue,
      isTopPerformer: classData.avgParticipants > 6
    });
    
    teacherHoursTracker[assignedTeacher] = parseFloat(((teacherHoursTracker[assignedTeacher] || 0) + parseFloat(duration)).toFixed(1));
    return true;
  };

  // Schedule classes for each location and day
  for (const location of locations) {
    for (const day of days) {
      // Morning shift
      for (const time of morningSlots) {
        const maxParallel = getMaxParallelClasses(location);
        
        // Get best performing classes for this slot
        const slotClasses = getTopPerformingClasses(csvData, 6)
          .filter(cls => 
            cls.location === location && 
            cls.day === day && 
            cls.time === time &&
            isClassAllowedAtLocation(cls.classFormat, location)
          )
          .sort(() => Math.random() - 0.5 + randomSeed)
          .slice(0, maxParallel);

        // Ensure variety in parallel classes
        const selectedClasses: any[] = [];
        const usedFormats = new Set<string>();
        
        slotClasses.forEach(cls => {
          if (!usedFormats.has(cls.classFormat) && selectedClasses.length < maxParallel) {
            selectedClasses.push(cls);
            usedFormats.add(cls.classFormat);
          }
        });

        selectedClasses.forEach(cls => addClassIfPossible(cls));
      }

      // Evening shift
      for (const time of eveningSlots) {
        if (!isValidEveningTime(time, day)) continue;
        
        const maxParallel = getMaxParallelClasses(location);
        
        const slotClasses = getTopPerformingClasses(csvData, 6)
          .filter(cls => 
            cls.location === location && 
            cls.day === day && 
            cls.time === time &&
            isClassAllowedAtLocation(cls.classFormat, location)
          )
          .sort(() => Math.random() - 0.5 + randomSeed)
          .slice(0, maxParallel);

        // Ensure variety in parallel classes
        const selectedClasses: any[] = [];
        const usedFormats = new Set<string>();
        
        slotClasses.forEach(cls => {
          if (!usedFormats.has(cls.classFormat) && selectedClasses.length < maxParallel) {
            selectedClasses.push(cls);
            usedFormats.add(cls.classFormat);
          }
        });

        selectedClasses.forEach(cls => addClassIfPossible(cls));
      }
    }
  }

  // Fill remaining hours for priority teachers
  priorityTeachers.forEach(priorityTeacher => {
    const fullName = allTeachers.find(teacher => teacher.includes(priorityTeacher));
    if (!fullName) return;
    
    const currentHours = teacherHoursTracker[fullName] || 0;
    const targetHours = 15;
    
    if (currentHours < targetHours) {
      const teacherSpecialtyClasses = teacherSpecialties[fullName] || [];
      
      for (const specialty of teacherSpecialtyClasses.slice(0, 3)) {
        if ((teacherHoursTracker[fullName] || 0) >= targetHours - 0.5) break;
        
        for (const location of locations) {
          if (!isClassAllowedAtLocation(specialty.classFormat, location)) continue;
          
          for (const day of days) {
            const allTimeSlots = [...morningSlots, ...eveningSlots];
            
            for (const time of allTimeSlots) {
              if (!isValidEveningTime(time, day) && eveningSlots.includes(time)) continue;
              
              const duration = getClassDuration(specialty.classFormat);
              
              if (hasTimeSlotCapacity(optimizedClasses, day, time, location) &&
                  canTeacherTakeClass(fullName, duration) &&
                  canTeacherTakeShiftClass(optimizedClasses, fullName, day, time) &&
                  !wouldCreateBackToBackSameFormat(optimizedClasses, { day, time, location, classFormat: specialty.classFormat })) {
                
                optimizedClasses.push({
                  id: `fill-priority-${location}-${day}-${time}-${Date.now()}-${Math.random()}`,
                  day,
                  time,
                  location,
                  classFormat: specialty.classFormat,
                  teacherFirstName: fullName.split(' ')[0],
                  teacherLastName: fullName.split(' ').slice(1).join(' '),
                  duration: duration,
                  participants: Math.round(specialty.avgParticipants),
                  revenue: 0,
                  isTopPerformer: specialty.avgParticipants > 6
                });
                
                teacherHoursTracker[fullName] = parseFloat(((teacherHoursTracker[fullName] || 0) + parseFloat(duration)).toFixed(1));
                break;
              }
            }
          }
        }
      }
    }
  });

  return optimizedClasses;
};

export const optimizeScheduleWithRules = (
  currentSchedule: ScheduledClass[],
  historicData: ClassData[],
  lockedClasses: Set<string> = new Set(),
  lockedTeachers: Set<string> = new Set()
): ScheduledClass[] => {
  const optimized = [...currentSchedule];
  const teacherHours = calculateTeacherHours(optimized);
  const priorityTeachers = ['Anisha', 'Mrigakshi', 'Vivaran'];
  
  // Rule 1: Ensure no teacher exceeds 15 hours
  const overloadedTeachers = Object.entries(teacherHours)
    .filter(([_, hours]) => hours > 15)
    .map(([teacher, hours]) => ({ teacher, hours }));

  overloadedTeachers.forEach(({ teacher, hours }) => {
    const teacherClasses = optimized.filter(cls => 
      `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher &&
      !lockedClasses.has(cls.id)
    );
    
    // Remove classes until under 15 hours, starting with non-priority classes
    let currentHours = hours;
    teacherClasses
      .sort((a, b) => {
        const aIsPriority = a.isTopPerformer ? 1 : 0;
        const bIsPriority = b.isTopPerformer ? 1 : 0;
        return aIsPriority - bIsPriority; // Remove non-priority first
      })
      .forEach(cls => {
        if (currentHours > 15) {
          const index = optimized.findIndex(c => c.id === cls.id);
          if (index !== -1) {
            optimized.splice(index, 1);
            currentHours -= parseFloat(cls.duration);
          }
        }
      });
  });

  return optimized;
};

export const ensureMinimumTeacherHours = (
  scheduledClasses: ScheduledClass[],
  customTeachers: any[] = [],
  minHours: number = 9
): ScheduledClass[] => {
  const teacherHours = calculateTeacherHours(scheduledClasses);
  const allTeachers = [
    ...new Set([
      ...scheduledClasses.map(cls => `${cls.teacherFirstName} ${cls.teacherLastName}`),
      ...customTeachers.map(t => `${t.firstName} ${t.lastName}`)
    ])
  ];

  const underutilizedTeachers = allTeachers.filter(teacher => 
    (teacherHours[teacher] || 0) < minHours
  );

  // For now, just log the underutilized teachers
  // In a real implementation, you'd want to suggest additional classes
  if (underutilizedTeachers.length > 0) {
    console.log('Teachers below minimum hours:', underutilizedTeachers);
  }

  return scheduledClasses;
};