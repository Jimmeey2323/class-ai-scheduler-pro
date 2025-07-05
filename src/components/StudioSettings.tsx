import React, { useState } from 'react';
import { X, UserPlus, Calendar, Clock, AlertTriangle, Save, Trash2, Users, Settings, MapPin, Star } from 'lucide-react';
import { CustomTeacher, TeacherAvailability } from '../types';

interface StudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  customTeachers: CustomTeacher[];
  onUpdateTeachers: (teachers: CustomTeacher[]) => void;
  teacherAvailability: TeacherAvailability;
  onUpdateAvailability: (availability: TeacherAvailability) => void;
}

const StudioSettings: React.FC<StudioSettingsProps> = ({
  isOpen,
  onClose,
  customTeachers,
  onUpdateTeachers,
  teacherAvailability,
  onUpdateAvailability
}) => {
  const [activeTab, setActiveTab] = useState('teachers');
  const [newTeacher, setNewTeacher] = useState({
    firstName: '',
    lastName: '',
    specialties: [] as string[],
    isNew: true
  });
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [isOnLeave, setIsOnLeave] = useState(false);

  const classFormats = [
    'Studio Barre 57', 'Studio Mat 57', 'Power Cycle', 'Recovery', 'Foundations',
    'Express Barre', 'Express Mat', 'Private Session', 'Group Training'
  ];

  const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];

  const handleAddTeacher = () => {
    if (!newTeacher.firstName || !newTeacher.lastName) {
      alert('Please enter both first and last name');
      return;
    }

    const teacher: CustomTeacher = {
      ...newTeacher,
      specialties: newTeacher.specialties.length > 0 ? newTeacher.specialties : ['Foundations', 'Recovery']
    };

    onUpdateTeachers([...customTeachers, teacher]);
    setNewTeacher({ firstName: '', lastName: '', specialties: [], isNew: true });
  };

  const handleRemoveTeacher = (index: number) => {
    const updatedTeachers = customTeachers.filter((_, i) => i !== index);
    onUpdateTeachers(updatedTeachers);
  };

  const handleUpdateAvailability = () => {
    if (!selectedTeacher) {
      alert('Please select a teacher');
      return;
    }

    const updatedAvailability = {
      ...teacherAvailability,
      [selectedTeacher]: {
        unavailableDates,
        isOnLeave,
        leaveStartDate: isOnLeave ? leaveStartDate : undefined,
        leaveEndDate: isOnLeave ? leaveEndDate : undefined
      }
    };

    onUpdateAvailability(updatedAvailability);
    alert('Teacher availability updated successfully!');
  };

  const addUnavailableDate = (date: string) => {
    if (date && !unavailableDates.includes(date)) {
      setUnavailableDates([...unavailableDates, date]);
    }
  };

  const removeUnavailableDate = (date: string) => {
    setUnavailableDates(unavailableDates.filter(d => d !== date));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-500/20 rounded-lg mr-3">
              <Settings className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Studio Settings</h2>
              <p className="text-sm text-gray-400">Manage teachers, availability, and studio preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'teachers'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="h-5 w-5 inline mr-2" />
            Teachers
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'availability'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="h-5 w-5 inline mr-2" />
            Availability
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'studio'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MapPin className="h-5 w-5 inline mr-2" />
            Studio
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              {/* Add New Teacher */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 rounded-xl border border-green-500/20">
                <h3 className="font-semibold text-green-300 mb-4 flex items-center">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add New Teacher
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={newTeacher.firstName}
                      onChange={(e) => setNewTeacher(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={newTeacher.lastName}
                      onChange={(e) => setNewTeacher(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Specialties
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {classFormats.map(format => (
                      <label key={format} className="flex items-center text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={newTeacher.specialties.includes(format)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTeacher(prev => ({ ...prev, specialties: [...prev.specialties, format] }));
                            } else {
                              setNewTeacher(prev => ({ ...prev, specialties: prev.specialties.filter(s => s !== format) }));
                            }
                          }}
                          className="mr-2 rounded"
                        />
                        {format}
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleAddTeacher}
                  className="mt-4 flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Teacher
                </button>
              </div>

              {/* Current Teachers */}
              <div>
                <h3 className="font-semibold text-white mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-400" />
                  Current Teachers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customTeachers.map((teacher, index) => (
                    <div key={index} className="bg-gray-800/50 p-4 rounded-xl border border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                            {teacher.firstName[0]}{teacher.lastName[0]}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {teacher.firstName} {teacher.lastName}
                              {priorityTeachers.some(name => teacher.firstName.includes(name)) && (
                                <Star className="h-4 w-4 text-yellow-400 inline ml-2" />
                              )}
                            </div>
                            {teacher.isNew && (
                              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                                New Teacher
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveTeacher(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-sm text-gray-400">
                        <strong>Specialties:</strong> {teacher.specialties.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'availability' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-6 rounded-xl border border-yellow-500/20">
                <h3 className="font-semibold text-yellow-300 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Teacher Availability Management
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Teacher
                    </label>
                    <select
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">Choose a teacher</option>
                      {customTeachers.map((teacher, index) => (
                        <option key={index} value={`${teacher.firstName} ${teacher.lastName}`}>
                          {teacher.firstName} {teacher.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center text-sm text-gray-300 mb-4">
                      <input
                        type="checkbox"
                        checked={isOnLeave}
                        onChange={(e) => setIsOnLeave(e.target.checked)}
                        className="mr-2 rounded"
                      />
                      Teacher is on leave
                    </label>
                  </div>
                </div>

                {isOnLeave && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Leave Start Date
                      </label>
                      <input
                        type="date"
                        value={leaveStartDate}
                        onChange={(e) => setLeaveStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Leave End Date
                      </label>
                      <input
                        type="date"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Add Unavailable Date
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      onChange={(e) => addUnavailableDate(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>

                {unavailableDates.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Unavailable Dates
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {unavailableDates.map(date => (
                        <span
                          key={date}
                          className="inline-flex items-center px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm"
                        >
                          {date}
                          <button
                            onClick={() => removeUnavailableDate(date)}
                            className="ml-2 text-red-400 hover:text-red-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpdateAvailability}
                  className="mt-4 flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Update Availability
                </button>
              </div>
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/20">
                <h3 className="font-semibold text-purple-300 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Studio Preferences
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center text-sm text-gray-300">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="mr-2 rounded"
                      />
                      Allow private class scheduling
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center text-sm text-gray-300">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="mr-2 rounded"
                      />
                      Enable automatic teacher assignment
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center text-sm text-gray-300">
                      <input
                        type="checkbox"
                        defaultChecked={false}
                        className="mr-2 rounded"
                      />
                      Require minimum 9 hours per teacher
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center text-sm text-gray-300">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="mr-2 rounded"
                      />
                      Enforce 15-hour maximum per teacher
                    </label>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <h4 className="font-medium text-blue-300 mb-2">Priority Teachers</h4>
                  <p className="text-sm text-blue-200 mb-3">
                    These teachers will be prioritized for maximum hours and premium time slots:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {priorityTeachers.map(teacher => (
                      <span
                        key={teacher}
                        className="inline-flex items-center px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        {teacher}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudioSettings;