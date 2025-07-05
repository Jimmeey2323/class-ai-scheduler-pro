import { ClassData, AIRecommendation, AIProvider, ScheduledClass, OptimizationSuggestion } from '../types';

export class AIService {
  private provider: AIProvider | null = null;

  constructor() {
    // Don't set a default provider with potentially invalid key
    this.provider = null;
  }

  setProvider(provider: AIProvider) {
    this.provider = provider;
  }

  async generateRecommendations(
    historicData: ClassData[],
    day: string,
    time: string,
    location: string
  ): Promise<AIRecommendation[]> {
    // Always return fallback recommendations if no provider is configured or key is missing
    if (!this.provider || !this.provider.key || this.provider.key.trim() === '') {
      console.warn('AI provider not configured or missing API key, using fallback recommendations');
      return this.getFallbackRecommendations(historicData, location, day, time);
    }

    const relevantData = historicData.filter(
      item => item.location === location && 
      item.dayOfWeek === day && 
      item.classTime.includes(time.slice(0, 5))
    );

    if (relevantData.length === 0) {
      return this.getFallbackRecommendations(historicData, location, day, time);
    }

    const prompt = this.buildRecommendationPrompt(relevantData, day, time, location);
    
    try {
      const response = await this.callAI(prompt);
      const recommendations = this.parseAIResponse(response);
      return recommendations.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.warn('AI service error, falling back to local recommendations:', error);
      return this.getFallbackRecommendations(historicData, location, day, time);
    }
  }

  async optimizeSchedule(
    historicData: ClassData[],
    currentSchedule: ScheduledClass[],
    teacherAvailability: any = {}
  ): Promise<OptimizationSuggestion[]> {
    // Always return fallback optimizations if no provider is configured or key is missing
    if (!this.provider || !this.provider.key || this.provider.key.trim() === '') {
      console.warn('AI provider not configured or missing API key, using fallback optimizations');
      return this.getFallbackOptimizations(historicData, currentSchedule);
    }

    const prompt = this.buildOptimizationPrompt(historicData, currentSchedule, teacherAvailability);
    
    try {
      const response = await this.callAI(prompt);
      const suggestions = this.parseOptimizationResponse(response);
      return suggestions.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.warn('AI optimization error, falling back to local optimizations:', error);
      return this.getFallbackOptimizations(historicData, currentSchedule);
    }
  }

  private buildRecommendationPrompt(data: ClassData[], day: string, time: string, location: string): string {
    const classPerformance = this.analyzeClassPerformance(data);
    const teacherPerformance = this.analyzeTeacherPerformance(data);

    return `
      Analyze fitness class scheduling for ${location} on ${day} at ${time}.
      
      Historic Class Performance:
      ${classPerformance.map(p => `- ${p.classFormat}: ${p.avgParticipants.toFixed(1)} avg participants, ₹${p.avgRevenue.toFixed(0)} revenue, ${p.frequency} times held`).join('\n')}
      
      Teacher Performance:
      ${teacherPerformance.map(p => `- ${p.teacher}: ${p.avgParticipants.toFixed(1)} avg participants across ${p.classesCount} classes`).join('\n')}
      
      Provide 5 recommendations in JSON format with priority scoring (1-10):
      {
        "recommendations": [
          {
            "classFormat": "class name",
            "teacher": "teacher name", 
            "reasoning": "detailed explanation",
            "confidence": 0.85,
            "expectedParticipants": 12,
            "expectedRevenue": 8000,
            "priority": 9
          }
        ]
      }
      
      Consider:
      - Historic success rates for class-teacher combinations
      - Time slot popularity and attendance patterns
      - Teacher expertise and past performance
      - Revenue optimization potential
      - Class variety and member engagement
    `;
  }

  private buildOptimizationPrompt(
    historicData: ClassData[], 
    currentSchedule: ScheduledClass[],
    teacherAvailability: any
  ): string {
    const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
    
    return `
      Optimize this fitness studio schedule following these strict rules:
      
      Current Schedule:
      ${currentSchedule.map(cls => `${cls.day} ${cls.time} - ${cls.classFormat} with ${cls.teacherFirstName} ${cls.teacherLastName} at ${cls.location}`).join('\n')}
      
      OPTIMIZATION RULES:
      1. Max 15 classes per teacher per week (prioritize Anisha, Mrigakshi, Vivaran for overages)
      2. Minimize trainers per shift per location (prefer 2 trainers for 4-5 classes)
      3. Assign experienced teachers to formats they've succeeded with
      4. Give all teachers 2 days off per week
      5. New teachers only for: Barre 57, Foundations, Recovery, Power Cycle
      6. Prioritize max hours for: ${priorityTeachers.join(', ')}
      7. Don't change successful historic combinations
      8. No overlapping classes for same teacher
      9. Fair mix of class levels horizontally and vertically
      10. Max 3-4 hours per teacher per day
      
      Provide optimization suggestions in JSON format:
      {
        "suggestions": [
          {
            "type": "teacher_change",
            "originalClass": {...},
            "suggestedClass": {...},
            "reason": "explanation",
            "impact": "expected improvement",
            "priority": 8
          }
        ]
      }
    `;
  }

  private analyzeClassPerformance(data: ClassData[]) {
    const classStats = data.reduce((acc, item) => {
      if (!acc[item.cleanedClass]) {
        acc[item.cleanedClass] = { participants: 0, revenue: 0, count: 0 };
      }
      acc[item.cleanedClass].participants += item.participants;
      acc[item.cleanedClass].revenue += item.totalRevenue;
      acc[item.cleanedClass].count += 1;
      return acc;
    }, {} as any);

    return Object.entries(classStats)
      .map(([classFormat, stats]: [string, any]) => ({
        classFormat,
        avgParticipants: stats.participants / stats.count,
        avgRevenue: stats.revenue / stats.count,
        frequency: stats.count
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants);
  }

  private analyzeTeacherPerformance(data: ClassData[]) {
    const teacherStats = data.reduce((acc, item) => {
      if (!acc[item.teacherName]) {
        acc[item.teacherName] = { participants: 0, count: 0 };
      }
      acc[item.teacherName].participants += item.participants;
      acc[item.teacherName].count += 1;
      return acc;
    }, {} as any);

    return Object.entries(teacherStats)
      .map(([teacher, stats]: [string, any]) => ({
        teacher,
        avgParticipants: stats.participants / stats.count,
        classesCount: stats.count
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants);
  }

  private async callAI(prompt: string): Promise<string> {
    if (!this.provider) throw new Error('No AI provider configured');
    if (!this.provider.key || this.provider.key.trim() === '') {
      throw new Error('No API key provided');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.provider.key}`
    };

    let body: any;
    let url = this.provider.endpoint;

    switch (this.provider.name) {
      case 'OpenAI':
        body = {
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        };
        break;
      
      case 'Anthropic':
        headers['anthropic-version'] = '2023-06-01';
        body = {
          model: 'claude-3-sonnet-20240229',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000
        };
        break;
      
      case 'DeepSeek':
        body = {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        };
        break;
      
      case 'Groq':
        body = {
          model: 'mixtral-8x7b-32768',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        };
        break;
      
      default:
        throw new Error('Unsupported AI provider');
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error (${response.status}): ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      
      if (this.provider.name === 'Anthropic') {
        return data.content?.[0]?.text || '';
      } else {
        return data.choices?.[0]?.message?.content || '';
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to AI service. Please check your internet connection.');
      }
      throw error;
    }
  }

  private parseAIResponse(response: string): AIRecommendation[] {
    try {
      const parsed = JSON.parse(response);
      return (parsed.recommendations || []).map((rec: any) => ({
        ...rec,
        priority: rec.priority || 5
      }));
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  private parseOptimizationResponse(response: string): OptimizationSuggestion[] {
    try {
      const parsed = JSON.parse(response);
      return (parsed.suggestions || []).map((sug: any) => ({
        ...sug,
        priority: sug.priority || 5
      }));
    } catch (error) {
      console.error('Failed to parse optimization response:', error);
      return [];
    }
  }

  private getFallbackRecommendations(
    data: ClassData[], 
    location: string, 
    day: string, 
    time: string
  ): AIRecommendation[] {
    const locationData = data.filter(item => item.location === location);
    const classStats = this.analyzeClassPerformance(locationData);

    // If no location data, use all data
    const analysisData = locationData.length > 0 ? locationData : data;
    const finalStats = locationData.length > 0 ? classStats : this.analyzeClassPerformance(data);

    return finalStats.slice(0, 5).map((stats, index) => ({
      classFormat: stats.classFormat,
      teacher: 'Best Available',
      reasoning: `High-performing class with ${stats.avgParticipants.toFixed(1)} average participants (based on historical data)`,
      confidence: Math.min(0.9, stats.frequency / 10),
      expectedParticipants: Math.round(stats.avgParticipants),
      expectedRevenue: Math.round(stats.avgRevenue),
      priority: 10 - index * 2
    }));
  }

  private getFallbackOptimizations(
    historicData: ClassData[],
    currentSchedule: ScheduledClass[]
  ): OptimizationSuggestion[] {
    // Basic optimization logic as fallback
    const suggestions: OptimizationSuggestion[] = [];
    
    // Find teachers with too many hours
    const teacherHours: Record<string, number> = {};
    currentSchedule.forEach(cls => {
      const teacherName = `${cls.teacherFirstName} ${cls.teacherLastName}`;
      teacherHours[teacherName] = (teacherHours[teacherName] || 0) + parseFloat(cls.duration || '1');
    });

    // Suggest redistributing hours for overloaded teachers
    Object.entries(teacherHours).forEach(([teacher, hours]) => {
      if (hours > 15) {
        const overloadedClasses = currentSchedule.filter(cls => 
          `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher
        );
        
        if (overloadedClasses.length > 0) {
          suggestions.push({
            type: 'teacher_change',
            originalClass: overloadedClasses[0],
            suggestedClass: {
              ...overloadedClasses[0],
              teacherFirstName: 'Alternative',
              teacherLastName: 'Teacher'
            },
            reason: `${teacher} is overloaded with ${hours} hours. Consider redistributing classes.`,
            impact: 'Better work-life balance and reduced teacher fatigue',
            priority: 7
          });
        }
      }
    });

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }
}

export const aiService = new AIService();